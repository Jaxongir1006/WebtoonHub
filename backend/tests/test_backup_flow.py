"""Exercise backup failure/success markers with fake tools and temporary artifacts."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest


class BackupFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        git_bash = Path('C:/Program Files/Git/bin/bash.exe')
        cls.bash = str(git_bash) if os.name == 'nt' and git_bash.exists() else shutil.which('bash')
        if not cls.bash:
            raise unittest.SkipTest('Bash is required for isolated backup shell tests')
        cls.script = Path(__file__).resolve().parents[2] / 'deploy/staging/backup.sh'

    def posix_path(self, path):
        if os.name != 'nt':
            return str(path)
        return subprocess.check_output([self.bash, '-c', 'cygpath -u "$1"', 'bash', str(path)], text=True).strip()

    def run_backup(self, *, offsite=False, fail_upload=None, corrupt_archive=False,
                   corrupt_imports=False, fail_import_capture=False, fail_unpause=False,
                   fail_pause=False, lock_busy=False, already_paused=False):
        self.temp = tempfile.TemporaryDirectory(prefix='webtoonhub-backup-regression-')
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        tools = root / 'tools'; tools.mkdir()
        media = root / 'media'; media.mkdir()
        (media / 'sample.txt').write_text('disposable backup payload', encoding='utf-8')
        imports = root / 'imports'; imports.mkdir()
        (imports / 'staged-page.webp').write_bytes(b'private resumable page')
        (tools / 'docker').write_text('''#!/bin/sh
printf '%s\\n' "$*" >> "$MOCK_DOCKER_LOG"
case "$*" in
  *" ps -q api") printf 'synthetic-api-container\n' ;;
  "inspect "*) if [ "${MOCK_ALREADY_PAUSED:-}" = 1 ]; then printf true; else printf false; fi ;;
  *" unpause api") if [ "${MOCK_FAIL_UNPAUSE:-}" = 1 ]; then exit 24; fi ;;
  *" pause api") if [ "${MOCK_FAIL_PAUSE:-}" = 1 ]; then exit 25; fi ;;
  *pg_dump*) printf 'synthetic PostgreSQL dump\n' ;;
  *pg_restore*) cat >/dev/null ;;
  *tar*)
    case "$*" in
      *private_chapter_imports*)
        if [ "${MOCK_FAIL_IMPORT_CAPTURE:-}" = 1 ]; then exit 23; fi
        if [ "${MOCK_CORRUPT_IMPORTS:-}" = 1 ]; then printf 'invalid private archive'; else tar -C "$MOCK_IMPORTS" -czf - .; fi ;;
      *) if [ "${MOCK_CORRUPT_ARCHIVE:-}" = 1 ]; then printf 'invalid archive'; else tar -C "$MOCK_MEDIA" -czf - .; fi ;;
    esac ;;
  *) exit 90 ;;
esac
''', encoding='utf-8')
        # Git Bash lacks util-linux. The fake exercises the shell's lock boundary;
        # Linux also has a real simultaneous flock regression below.
        if os.name == 'nt' or lock_busy:
            (tools / 'flock').write_text('#!/bin/sh\n[ "${MOCK_LOCK_BUSY:-}" != 1 ]\n', encoding='utf-8')
        (tools / 'aws').write_text('''#!/bin/sh
printf '%s\n' "$*" >> "$MOCK_UPLOAD_LOG"
count=$(wc -l < "$MOCK_UPLOAD_LOG")
if [ "$count" = "${MOCK_FAIL_UPLOAD:-}" ]; then exit 17; fi
''', encoding='utf-8')
        for path in tools.iterdir(): path.chmod(0o755)
        env = os.environ.copy()
        env.update(BACKUP_STACK_DIR=self.posix_path(root), MOCK_MEDIA=self.posix_path(media),
                   MOCK_IMPORTS=self.posix_path(imports), MOCK_DOCKER_LOG=self.posix_path(root/'docker.log'),
                   MOCK_UPLOAD_LOG=self.posix_path(root/'uploads.log'))
        env.pop('BACKUP_S3_URI', None)
        if offsite: env['BACKUP_S3_URI'] = 's3://isolated-test-bucket/audit'
        if fail_upload is not None: env['MOCK_FAIL_UPLOAD'] = str(fail_upload)
        if corrupt_archive: env['MOCK_CORRUPT_ARCHIVE'] = '1'
        if corrupt_imports: env['MOCK_CORRUPT_IMPORTS'] = '1'
        if fail_import_capture: env['MOCK_FAIL_IMPORT_CAPTURE'] = '1'
        if fail_unpause: env['MOCK_FAIL_UNPAUSE'] = '1'
        if fail_pause: env['MOCK_FAIL_PAUSE'] = '1'
        if lock_busy: env['MOCK_LOCK_BUSY'] = '1'
        if already_paused: env['MOCK_ALREADY_PAUSED'] = '1'
        result = subprocess.run([self.bash, '-c', 'PATH="$1:$PATH"; export PATH; exec sh "$2"',
                                 'bash', self.posix_path(tools), self.posix_path(self.script)],
                                 env=env, capture_output=True, text=True, timeout=30)
        return root, result

    def test_local_artifacts_are_validated_and_unconfigured_offsite_is_explicit(self):
        root, result = self.run_backup()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Offsite backup is unconfigured', result.stderr)
        backups = root/'backups'
        self.assertTrue((backups/'latest-local-success').exists())
        self.assertFalse((backups/'latest-offsite-success').exists())
        manifest = next(backups.glob('manifest-*.sha256'))
        self.assertEqual(len(manifest.read_text().splitlines()), 3)
        for line in manifest.read_text().splitlines():
            checksum, filename = line.split(maxsplit=1)
            self.assertEqual(checksum, hashlib.sha256((backups/filename.lstrip('*')).read_bytes()).hexdigest())
        with tarfile.open(next(backups.glob('content-*.tar.gz'))) as archive:
            self.assertEqual(archive.extractfile('./sample.txt').read(), b'disposable backup payload')
        with tarfile.open(next(backups.glob('imports-*.tar.gz'))) as archive:
            self.assertEqual(archive.extractfile('./staged-page.webp').read(), b'private resumable page')
        docker_calls = (root / 'docker.log').read_text().splitlines()
        paused = next(index for index, line in enumerate(docker_calls) if line.endswith(' pause api'))
        resumed = next(index for index, line in enumerate(docker_calls) if line.endswith(' unpause api'))
        captures = [index for index, line in enumerate(docker_calls) if 'pg_dump' in line or '--entrypoint tar' in line]
        self.assertEqual(len(captures), 3)
        self.assertTrue(all(paused < index < resumed for index in captures))
        self.assertTrue(all('run --rm --no-deps' in docker_calls[index] for index in captures if 'tar' in docker_calls[index]))
        self.assertFalse(list(backups.glob('*.partial')))

    def test_offsite_success_requires_all_artifacts_including_manifest(self):
        root, result = self.run_backup(offsite=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        lines = (root/'uploads.log').read_text().splitlines()
        self.assertEqual(len(lines), 4)
        self.assertIn('imports-', lines[2])
        self.assertIn('manifest-', lines[3])
        self.assertTrue((root/'backups/latest-offsite-success').exists())

    def test_failed_offsite_upload_preserves_local_copy_without_success_marker(self):
        root, result = self.run_backup(offsite=True, fail_upload=3)
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue((root/'backups/latest-local-success').exists())
        self.assertFalse((root/'backups/latest-offsite-success').exists())
        self.assertFalse((root/'backups/latest-success').exists())

    def test_corrupt_archive_is_not_marked_successful(self):
        root, result = self.run_backup(corrupt_archive=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((root/'backups/latest-success').exists())
        self.assertFalse(list((root/'backups').glob('*.partial')))

    def test_corrupt_private_archive_is_not_marked_successful(self):
        root, result = self.run_backup(corrupt_imports=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((root/'backups/latest-local-success').exists())
        self.assertFalse((root/'backups/latest-success').exists())
        self.assertFalse(list((root/'backups').glob('*.partial')))

    def test_capture_failure_always_resumes_api_and_discards_partial_archives(self):
        root, result = self.run_backup(fail_import_capture=True)
        self.assertNotEqual(result.returncode, 0)
        calls = (root/'docker.log').read_text().splitlines()
        self.assertEqual(sum(line.endswith(' pause api') for line in calls), 1)
        self.assertEqual(sum(line.endswith(' unpause api') for line in calls), 1)
        self.assertFalse((root/'backups/latest-local-success').exists())
        self.assertFalse(list((root/'backups').glob('*.partial')))

    def test_failed_api_resume_reports_recovery_without_success_marker(self):
        root, result = self.run_backup(fail_unpause=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('API could not be resumed after backup', result.stderr)
        self.assertFalse((root/'backups/latest-local-success').exists())
        self.assertFalse((root/'backups/latest-success').exists())

    def test_busy_lock_exits_before_api_pause_or_capture(self):
        root, result = self.run_backup(lock_busy=True)
        self.assertEqual(result.returncode, 75, result.stderr)
        self.assertFalse((root/'docker.log').exists())
        self.assertFalse((root/'backups/latest-success').exists())

    def test_failed_pause_does_not_unpause_an_api_it_did_not_pause(self):
        root, result = self.run_backup(fail_pause=True)
        self.assertEqual(result.returncode, 25, result.stderr)
        calls = (root/'docker.log').read_text().splitlines()
        self.assertEqual(sum(line.endswith(' pause api') for line in calls), 1)
        self.assertFalse(any(line.endswith(' unpause api') for line in calls))
        self.assertFalse((root/'backups/latest-success').exists())

    def test_existing_pause_is_left_owned_by_its_original_operator(self):
        root, result = self.run_backup(already_paused=True)
        self.assertEqual(result.returncode,75,result.stderr)
        calls=(root/'docker.log').read_text().splitlines()
        self.assertFalse(any(line.endswith(' pause api') or line.endswith(' unpause api') for line in calls))
        self.assertFalse((root/'backups/latest-success').exists())

    @unittest.skipIf(os.name == 'nt', 'Real flock is verified on Linux in CI')
    def test_external_lock_owner_blocks_an_overlapping_backup(self):
        if not shutil.which('flock'): self.skipTest('util-linux flock unavailable')
        root, initial = self.run_backup()
        self.assertEqual(initial.returncode, 0, initial.stderr)
        (root/'docker.log').unlink()
        lock = root/'backups/.backup.lock'
        owner = subprocess.Popen([self.bash, '-c', 'exec 9>"$1"; flock 9; printf ready; read answer', 'bash', str(lock)],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        try:
            self.assertEqual(owner.stdout.read(5), 'ready')
            blocked = subprocess.run(['sh', str(self.script)], env={**os.environ,'BACKUP_STACK_DIR':str(root)},
                                     capture_output=True, text=True, timeout=5)
            self.assertEqual(blocked.returncode, 75, blocked.stderr)
            self.assertFalse((root/'docker.log').exists())
        finally:
            owner.communicate('release\n', timeout=5)
