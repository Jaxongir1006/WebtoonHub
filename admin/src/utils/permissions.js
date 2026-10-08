export const WHEEL_PERMISSIONS = ['wheel:manage', 'settings:manage', 'shop:manage']

export function isSystemRole(role, key) {
  return role?.system_key === key || (role?.system_key === undefined && role?.name === key)
}
