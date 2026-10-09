import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import * as Vue from 'vue'
import { createSSRApp, createRenderer, nextTick } from 'vue'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { compile as compileDom } from '@vue/compiler-dom'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { webtoonFormData, chapterFormData, moveItem, pageCount } from '../src/utils/forms.js'
import { validateContract } from './validate-contract.mjs'

const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,String(value)), removeItem: key => storage.delete(key) }
globalThis.window = { performance: globalThis.performance, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({matches: true,addEventListener(){},removeEventListener(){}}), confirm: () => true, location: {assign(){}} }
globalThis.document = { getElementById: () => null, body: { style: {overflow:''} }, activeElement: null, documentElement: { classList: {add(){},remove(){},toggle(){}}, setAttribute(){} } }
Object.defineProperty(globalThis, 'navigator', { value: {userAgent: 'Regression runner'}, configurable: true })
const originalInterval = globalThis.setInterval
globalThis.setInterval = (...args) => { const timer = originalInterval(...args); timer.unref(); return timer }

const zero = chapterFormData({webtoon_id:9,chapter_number:4.5,reward_coins:0,title:'',content_text:''})
assert.equal(zero.get('reward_coins'), '0')
assert.equal(zero.get('content_text'), '')
assert.equal(chapterFormData(zero), zero, 'Existing multipart payloads must retain all fields and files')
const edit = webtoonFormData({title:'Saved title',description:'',genre_ids:[2,7],status:'completed'})
assert.equal(edit.get('title'), 'Saved title')
assert.equal(edit.get('description'), '')
assert.equal(edit.get('genre_ids'), '[2,7]')
const records = [{file:{name:'first'},url:'first-preview'},{file:{name:'second'},url:'second-preview'}]
moveItem(records, 0, 1)
assert.equal(records[0].file.name, 'second')
assert.equal(records[0].url, 'second-preview')
assert.equal(pageCount(101,25), 5)

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let checks = 6
try {
  const {default:i18n} = await server.ssrLoadModule('/src/i18n/index.js')
  const {useAuthStore} = await server.ssrLoadModule('/src/stores/auth.js')
  const {default:client} = await server.ssrLoadModule('/src/api/client.js')
  const {webtoonsApi} = await server.ssrLoadModule('/src/api/webtoons.js')
  // All network requests are in-memory; no real database or server is contacted.
  client.defaults.adapter = async config => ({status:200,statusText:'OK',headers:{},config,data:{success:true,data: config.url==='/auth/me' ? {username:'Regression',role:{name:'superadmin'},permissions:[]} : config.url.startsWith('/webtoons/') ? {id:9,title:'Fixture',type:'novel',chapters:[]} : {items:[],total:0}}})

  async function mount(file, props={}, identity={username:'Regression',role:{name:'superadmin'},permissions:[]}) {
    const {default:original} = await server.ssrLoadModule(file)
    let state
    const component = {...original, setup(p,context) { state=original.setup(p,context); return state }}
    const pinia=createPinia(), auth=useAuthStore(pinia)
    auth.token='fixture';auth.staff=identity
    const app=createSSRApp(component,props)
    app.use(pinia); app.use(i18n)
    const router=createRouter({history:createMemoryHistory(),routes:[{path:'/:pathMatch(.*)*',component:{render(){return null}}}]})
    await router.push('/webtoons/9'); await router.isReady(); app.use(router)
    app.config.warnHandler=()=>{}
    app.config.errorHandler=error=>{throw error}
    const ssrContext={}
    const html=await renderToString(app,ssrContext)+(ssrContext.teleports?.body||'')
    return {state, html, auth}
  }
  // SSR intentionally skips non-immediate watchers. This Vue client renderer evaluates
  // setup, live watchers and mount hooks without requiring a browser or real API.
  async function mountClient(file, fullTemplate=false) {
    const {default:original}=await server.ssrLoadModule(file)
    function descendants(node) { return (node.children||[]).flatMap(child=>[child,...descendants(child)]) }
    function makeNode(tag,text='') {
      const node={tag,text,props:{},children:[],parent:null,isConnected:true,offsetParent:{}}
      node.focus=()=>{document.activeElement=node}
      node.querySelectorAll=selector=>descendants(node).filter(child=>(child.tag==='button'&&!child.props.disabled)||(child.tag==='a'&&child.props.href))
      node.querySelector=selector=>selector==='button'?descendants(node).find(child=>child.tag==='button'):node.querySelectorAll(selector)[0]
      return node
    }
    const renderer=createRenderer({
      createElement:tag=>makeNode(tag),createText:text=>makeNode('#text',text),createComment:text=>makeNode('#comment',text),
      setText:(node,text)=>{node.text=text},setElementText:(node,text)=>{node.text=text;node.children=[]},
      parentNode:node=>node.parent,nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1]||null,
      patchProp:(node,key,previous,next)=>{node.props[key]=next},
      insert(node,parent,anchor=null){if(node.parent){const old=node.parent.children.indexOf(node);if(old>=0)node.parent.children.splice(old,1)}node.parent=parent;const index=anchor?parent.children.indexOf(anchor):-1;parent.children.splice(index<0?parent.children.length:index,0,node)},
      remove(node){const index=node.parent?.children.indexOf(node);if(index>=0)node.parent.children.splice(index,1);node.isConnected=false}
    })
    const source=fs.readFileSync(path.resolve('.'+file),'utf8')
    const render=fullTemplate ? new Function('Vue',compileDom(parseSfc(source).descriptor.template.content,{mode:'function'}).code)(Vue) : ()=>null
    let state
    const component={...original,render,setup(props,context){state=original.setup(props,context);return {...state}}}
    const app=renderer.createApp(component)
    app.provide(Vue.ssrContextKey,{modules:new Set()})
    const pinia=createPinia(),auth=useAuthStore(pinia)
    auth.token='fixture';auth.staff={username:'Regression',role:{name:'superadmin'},permissions:[]}
    app.use(pinia);app.use(i18n)
    const router=createRouter({history:createMemoryHistory(),routes:[{path:'/:pathMatch(.*)*',component:{render(){return null}}}]})
    await router.push('/dashboard');await router.isReady();app.use(router)
    app.config.warnHandler=()=>{};app.config.errorHandler=error=>{throw error}
    const container=makeNode('root');app.mount(container);await nextTick()
    return {state,container,find:predicate=>descendants(container).find(predicate),unmount:()=>app.unmount()}
  }
  const role = await mount('/src/components/rbac/RoleFormModal.vue',{modelValue:true,role:null,permissions:[{id:31,code:'chapters:create'},{id:42,code:'comments:moderate'}],onSave:async()=>{}})
  assert.deepEqual(role.state.form.permission_ids, [])
  role.state.selectAll()
  assert.deepEqual(role.state.form.permission_ids, [31,42]); checks+=2

  const staff = await mount('/src/components/rbac/StaffUserModal.vue',{modelValue:true,staff:null,roles:[{id:7,name:'superadmin'}],onSave:async()=>{}})
  assert.equal(staff.state.form.role_id, '');checks++

  let resolveSave, called=0; const events=[]
  const deferred = new Promise(resolve=>{resolveSave=resolve})
  const pending = await mount('/src/components/rbac/RoleFormModal.vue',{modelValue:true,role:{id:5,name:'Editor'},permissions:[],onSave:()=>{called++;return deferred},'onUpdate:modelValue':value=>events.push(value)})
  pending.state.form.name='My draft'
  const submission=pending.state.handleSubmit()
  assert.equal(pending.state.isSubmitting.value,true)
  assert.deepEqual(events,[])
  await pending.state.handleSubmit();assert.equal(called,1)
  resolveSave();await submission
  assert.equal(pending.state.isSubmitting.value,false)
  assert.deepEqual(events,[false]);checks+=5

  const failed = await mount('/src/components/rbac/RoleFormModal.vue',{modelValue:true,role:{id:5,name:'Draft'},permissions:[],onSave:async()=>{throw {response:{data:{detail:'Retry this draft'}}}},'onUpdate:modelValue':value=>events.push(value)})
  failed.state.form.description='Keep this text'
  await failed.state.handleSubmit()
  assert.equal(failed.state.form.description,'Keep this text')
  assert.equal(failed.state.submitError.value,'Retry this draft')
  assert.equal(events.length,1);checks+=3

  const chapter = await mount('/src/components/webtoons/ChapterEditModal.vue',{modelValue:true,chapter:{id:3,chapter_number:1,reward_coins:0,images:[{id:5,image_url:'a.png'},{id:6,image_url:'b.png'}]},onSave:async()=>{}})
  assert.equal(chapter.state.form.reward_coins,0)
  chapter.state.moveImage(0,1);assert.deepEqual(chapter.state.form.images.map(image=>image.id),[6,5]);checks+=2

  const webtoon=await mount('/src/components/webtoons/WebtoonFormModal.vue',{modelValue:true,webtoon:{id:9,type:'manga',genre_ids:[7]},genres:[{id:7,name:'Drama'},{id:8,name:'Action'}],onSave:async()=>{}})
  assert.deepEqual([...webtoon.html.matchAll(/aria-pressed="(true|false)"/g)].map(match=>match[1]),['false','true','false','true','false']);checks++
  const overlay=await mount('/src/components/common/Badge.vue',{variant:'success',solid:true})
  assert(overlay.html.includes('bg-emerald-100'));assert(!overlay.html.includes('bg-emerald-500/15'));checks+=2

  const files = await mount('/src/components/webtoons/ChapterUploadModal.vue',{modelValue:false,webtoons:[],onUpload:async()=>{}})
  assert.equal(files.state.form.webtoon_id,null)
  const preselected=await mount('/src/components/webtoons/ChapterUploadModal.vue',{modelValue:false,preselectedWebtoonId:9,preselectedChapterNumber:8.5,onUpload:async()=>{}})
  assert.equal(preselected.state.form.chapter_number,8.5);checks++
  const first = new File(['a'],'first.png',{type:'image/png'}), second = new File(['b'],'second.png',{type:'image/png'})
  files.state.processFiles([first,second]); files.state.moveImage(0,1)
  assert.equal(files.state.rawFiles.value[0],second)
  const selectedPreview = files.state.uploadedImages.value[0]
  files.state.removeImage(0)
  assert.equal(files.state.rawFiles.value[0],first)
  assert.notEqual(files.state.uploadedImages.value[0], selectedPreview)
  files.state.clearImages(); checks+=4

  const reader=await mount('/src/views/UsersView.vue')
  const readerRequests=[]
  client.defaults.adapter=async config=>{
    readerRequests.push(config)
    return {status:200,statusText:'OK',headers:{},config,data:{success:true,data:{items:[],total:0}}}
  }
  await reader.state.onUserUpdated({id:17,username:'Reader',is_active:false,coins:999})
  assert.deepEqual(JSON.parse(readerRequests.find(request=>request.method==='patch').data),{is_active:false});checks++

  const coinsOnly=await mount('/src/views/EconomyView.vue',{}, {username:'Finance',role:{name:'accountant'},permissions:['coins:view']})
  readerRequests.length=0
  await coinsOnly.state.loadData()
  assert.deepEqual(readerRequests.map(request=>request.url),['/economy/transactions'])
  assert.equal(coinsOnly.state.settingsLoaded.value,false);checks+=2
  const giftOnly=await mount('/src/views/EconomyView.vue',{}, {username:'Gift',role:{name:'gifts'},permissions:['coins:distribute']})
  readerRequests.length=0;await giftOnly.state.loadData()
  assert.equal(readerRequests.length,0)
  assert.equal(giftOnly.state.canReadTransactions.value,false);checks+=2

  const requests=[]
  client.defaults.adapter=async config=>{
    requests.push(config)
    return {status:200,statusText:'OK',headers:{},config,data:{success:true,data: config.url.endsWith('/images') ? [{id:77,image_url:'new.png'}] : {}}}
  }
  await webtoonsApi.updateWebtoon(9,{title:'Edited',description:'',genre_ids:[7]})
  assert(requests.at(-1).data instanceof FormData)
  assert.equal(requests.at(-1).data.get('description'),'')
  await webtoonsApi.uploadChapter(zero)
  assert.equal(requests.at(-1).data,zero)
  assert.equal(requests.at(-1).timeout,120000)
  await webtoonsApi.updateChapter(3,{id:3,chapter_number:1,reward_coins:0,image_ids:[6,5],newFiles:[first],uploadBatchKey:'stable-draft-key'})
  const imageUpload=requests.find(request=>request.url==='/chapters/3/images')
  assert.equal(imageUpload.headers['Idempotency-Key'],'stable-draft-key')
  assert.equal(imageUpload.data.get('retained_image_ids'),'[6,5]')
  const atomicUpdate = JSON.parse(imageUpload.data.get('chapter_update'))
  assert.equal(atomicUpdate.id,undefined)
  assert.equal(atomicUpdate.image_ids,undefined,'Retained-image ordering must be part of the atomic idempotent upload')
  assert.equal(validateContract('ChapterUpdateRequest', atomicUpdate),true)
  assert.equal(requests.filter(request=>request.url==='/chapters/3').length,0,'One atomic request must own metadata and images')
  checks+=10

  const dialogEvents=[]
  const modal=await mount('/src/components/common/Modal.vue',{modelValue:true,title:'Draft',busy:true,'onUpdate:modelValue':value=>dialogEvents.push(value)})
  modal.state.close();assert.deepEqual(dialogEvents,[]);checks++
  const dirty=await mount('/src/components/common/Modal.vue',{modelValue:true,title:'Draft','onUpdate:modelValue':value=>dialogEvents.push(value)})
  dirty.state.hasChanges.value=true
  window.confirm=()=>false
  dirty.state.close();assert.deepEqual(dialogEvents,[])
  window.confirm=()=>true
  dirty.state.close();assert.deepEqual(dialogEvents,[false]);checks+=2
  let focused='',prevented=false
  const firstControl={offsetParent:{},focus(){focused='first'}},lastControl={offsetParent:{},focus(){focused='last'}}
  dirty.state.dialog.value={querySelectorAll(){return[firstControl,lastControl]}}
  document.activeElement=lastControl
  dirty.state.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented=true}})
  assert.equal(focused,'first');assert.equal(prevented,true);checks+=2

  const {localizeApiError}=await server.ssrLoadModule('/src/utils/apiErrors.js')
  i18n.global.locale.value='en'
  assert.equal(localizeApiError({response:{status:401,data:{detail:'Autorizatsiya talab qilinadi'}}}),'Your session expired. Sign in again.')
  assert.equal(localizeApiError({response:{status:400,data:{detail:'Chaqmoq yetarli emas'}}}),'The account has insufficient Lightning.')
  assert.equal(localizeApiError({response:{status:409,data:{detail:'Chapter number already exists'}}}),'That chapter number already exists. Choose another number.')
  assert.match(localizeApiError({response:{status:409,data:{detail:'This item is owned or used by a wheel. Hide it from sale instead of deleting it.'}}}),/Hide it from sale/)
  i18n.global.locale.value='uz';checks+=4

  // A failed sign-in is a credential error, not an expired authenticated session.
  const previousAdapter=client.defaults.adapter,previousDispatch=window.dispatchEvent
  const previousStaffToken=localStorage.getItem('webtoonhub_staff_token')
  const authEvents=[],failedSignIns=[]
  window.dispatchEvent=event=>{authEvents.push(event.type)}
  localStorage.setItem('webtoonhub_staff_token','existing-session-fixture')
  client.defaults.adapter=async config=>{
    failedSignIns.push(config)
    throw {config,response:{status:401,data:{success:false,error:{code:'HTTP_401',message:"Kiritilgan email yoki parol xodimlar ro'yxatida topilmadi"}}}}
  }
  try {
    const expectedMessages={
      en:'Incorrect email/username or password. Please try again.',
      ru:'Неверная почта, имя пользователя или пароль. Попробуйте снова.',
      uz:'Email, foydalanuvchi nomi yoki parol noto‘g‘ri. Qayta urining.'
    }
    for(const locale of ['en','ru','uz']) {
      i18n.global.locale.value=locale
      const login=await mount('/src/views/LoginView.vue')
      for(const identifier of ['unknown-staff@example.invalid','Known fixture username']) {
        login.state.email.value=identifier
        login.state.password.value='incorrect-fixture-password'
        await login.state.handleLogin()
        assert.equal(login.state.errorMessage.value,expectedMessages[locale])
        assert.equal(login.state.isLoading.value,false)
        assert.equal(JSON.parse(failedSignIns.at(-1).data).email,identifier)
        assert.equal(localStorage.getItem('webtoonhub_staff_token'),'existing-session-fixture')
        checks+=4
      }
      assert.equal(localizeApiError({config:{url:'http://localhost/api/v1/staff/auth/login/?retry=1'},response:{status:401,data:{detail:'Invalid credentials'}}}),expectedMessages[locale]);checks++
    }
    assert.equal(authEvents.filter(type=>type==='staff-session-expired').length,0);checks++
    i18n.global.locale.value='en'
    await assert.rejects(client.get('/auth/me'),error=>error.userMessage==='Your session expired. Sign in again.')
    assert.equal(authEvents.filter(type=>type==='staff-session-expired').length,1);checks+=2
    localStorage.removeItem('webtoonhub_staff_token')
    await assert.rejects(client.get('/auth/me'))
    assert.equal(authEvents.filter(type=>type==='staff-session-expired').length,1);checks+=2
  } finally {
    client.defaults.adapter=previousAdapter
    window.dispatchEvent=previousDispatch
    if(previousStaffToken===null) localStorage.removeItem('webtoonhub_staff_token')
    else localStorage.setItem('webtoonhub_staff_token',previousStaffToken)
    i18n.global.locale.value='uz'
  }

  function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]) }
  const sources=walk(path.resolve('src')).filter(file=>/\.(vue|js)$/.test(file)&&!file.includes(path.sep+'i18n'+path.sep))
  const keys=new Set(sources.flatMap(file=>[...fs.readFileSync(file,'utf8').matchAll(/(?:\$t|\bt|\btr)\(\s*['"]([^'"]+)['"]\s*(?=[,)])/g)].map(match=>match[1])))
  const variables=Object.fromEntries(Array.from({length:10},(_,index)=>['value'+index,'fixture']))
  for(const locale of ['uz','en','ru']) {
    i18n.global.locale.value=locale
    for(const key of keys) assert(i18n.global.te(key,locale),`${locale} lacks ${key}`)
    const staffMessages=i18n.global.getLocaleMessage(locale).staff
    assert.equal(Object.keys(staffMessages).length,620)
    for(const key of Object.keys(staffMessages)) {
      const value=i18n.global.t('staff.'+key,variables)
      assert.equal(typeof value,'string')
      assert.notEqual(value,'staff.'+key,`${locale} failed to compile staff.${key}`)
    }
    await mount('/src/components/layout/Header.vue')
    await mount('/src/components/layout/Sidebar.vue')
    checks+=3
  }
  i18n.global.locale.value='uz'

  // Exercise mounted studio saves against exported backend request contracts.
  // A callback that merely accepts arbitrary objects cannot catch payload drift.
  const {shopApi}=await server.ssrLoadModule('/src/api/shop.js')
  const {usersApi}=await server.ssrLoadModule('/src/api/users.js')
  const contractRequests=[]
  const savedAdapter=client.defaults.adapter
  client.defaults.adapter=async config=>{
    if(config.method==='patch'&&config.url.startsWith('/shop/items/')) validateContract('ShopItemUpdateRequest',JSON.parse(config.data))
    if(config.method==='post'&&config.url.endsWith('/images')) validateContract('ChapterUpdateRequest',JSON.parse(config.data.get('chapter_update')))
    contractRequests.push(config)
    return {status:200,statusText:'OK',headers:{},config,data:{success:true,data:config.url==='/shop/series'?{items:[{id:9,title:'Fixture series',type:'manga'}],total:1}: {}}}
  }
  for(const type of ['frame','background','card']) {
    const item={id:30,name:'Fixture item',item_type:type,asset_url:'/content/shop/fixture.webp',price_coins:50,rarity:'common',character_name:'Fixture hero'}
    const editor=await mount('/src/components/shop/ShopItemModal.vue',{modelValue:true,item,onSave:body=>shopApi.updateItem(item.id,body)})
    editor.state.form.price_coins=75
    await editor.state.handleSubmit()
    assert.equal(editor.state.submitError.value,'')
    const request=contractRequests.filter(request=>request.method==='patch').at(-1)
    if(type==='card') assert.equal(Object.hasOwn(JSON.parse(request.data),'price_coins'),false)
    else assert.equal(JSON.parse(request.data).price_coins,75)
    assert.equal(Object.hasOwn(JSON.parse(request.data),'id'),false)
    assert.equal(Object.hasOwn(JSON.parse(request.data),'border_style'),false)
    checks+=4
  }
  assert.throws(()=>validateContract('ShopItemUpdateRequest',{name:'Fixture',id:30}))
  assert.throws(()=>validateContract('ReaderUpdateRequest',{is_active:true,lightning_coins:900}))
  assert.throws(()=>validateContract('EconomyUpdate',{comment_reward:2}));checks+=3
  const shopOnly=await mount('/src/components/shop/ShopItemModal.vue',{modelValue:true,initialType:'card',onSave:async()=>{}},{id:93,username:'Shop fixture',role:{name:'shop'},permissions:['shop:manage']})
  await shopOnly.state.loadSeries()
  assert.equal(shopOnly.state.catalogError.value,false)
  assert.equal(shopOnly.state.seriesList.value[0].title,'Fixture series')
  assert(contractRequests.some(request=>request.url==='/shop/series'))
  assert(!contractRequests.some(request=>request.url==='/webtoons'));checks+=4

  const scopedRole=await mount('/src/components/rbac/RoleFormModal.vue',{modelValue:true,role:{id:7,name:'Renamed creator',scope:'own_content',system_key:'creator',permission_ids:[]},permissions:[],onSave:async()=>{}})
  assert(scopedRole.html.includes('Kontentga kirish'))
  assert(scopedRole.html.includes('Faqat ushbu rol xodimlariga tegishli kontent'))
  scopedRole.auth.staff={id:1,role:{name:'Renamed owner',system_key:'superadmin'},permissions:[]}
  assert.equal(scopedRole.auth.hasPermission('wheel:manage'),true)
  scopedRole.auth.staff={id:1,role:{name:'superadmin',system_key:null},permissions:[]}
  assert.equal(scopedRole.auth.hasPermission('wheel:manage'),false);checks+=4

  // Button-based changes and keyboard text edits both compare the draft value.
  const draft=Vue.reactive({order:[11,12],genre_ids:[7],text:'Original'})
  const draftEvents=[]
  const draftModal=await mount('/src/components/common/Modal.vue',{modelValue:true,title:'Draft',draft,'onUpdate:modelValue':value=>draftEvents.push(value)})
  const savedConfirm=window.confirm;let confirmations=0
  window.confirm=()=>{confirmations++;return false}
  draft.order.reverse();draftModal.state.close();assert.deepEqual(draftEvents,[])
  draft.order.reverse();draft.genre_ids.push(8);draftModal.state.close();assert.deepEqual(draftEvents,[])
  draft.genre_ids.pop();draft.text='Typed with keyboard';draftModal.state.close();assert.deepEqual(draftEvents,[])
  assert.equal(confirmations,3)
  draft.text='Original';draftModal.state.close();assert.deepEqual(draftEvents,[false])
  assert.equal(confirmations,3);window.confirm=savedConfirm;checks+=6

  for(const [view,method,status] of [['Moderation','moderate','published'],['CreatorRequests','review','approved']]) {
    let resolveReview;const reviewRequests=[]
    client.defaults.adapter=async config=>{
      reviewRequests.push(config)
      const response={status:200,statusText:'OK',headers:{},config,data:{success:true,data:config.url==='/chapters'?{items:[],total:0}:[]}}
      return config.method==='patch'?new Promise(resolve=>{resolveReview=()=>resolve(response)}):response
    }
    const queue=await mount(`/src/views/${view}View.vue`)
    const firstReview=queue.state[method](1,status)
    await new Promise(resolve=>setImmediate(resolve))
    queue.state.openRejection(2);assert.equal(queue.state.showRejection.value,false)
    queue.state.rejectionId.value=2
    const rejectionEvents=[]
    const rejecting=await mount('/src/components/common/RejectionModal.vue',{modelValue:true,onSave:queue.state.rejectWithReason,'onUpdate:modelValue':value=>rejectionEvents.push(value)})
    rejecting.state.reason.value='Needs revision'
    await rejecting.state.submit()
    assert.deepEqual(rejectionEvents,[])
    assert(rejecting.state.error.value.length>0)
    assert.equal(reviewRequests.filter(request=>request.method==='patch').length,1)
    resolveReview();await firstReview;checks+=4
  }

  const {prepareOperation,pendingOperation,completeOperation}=await server.ssrLoadModule('/src/utils/operationIntents.js')
  const intent=prepareOperation(94,'adjust:17',{userId:17,amount:25,reason:'Fixture'})
  assert.equal(prepareOperation(94,'adjust:17',{userId:17,amount:25,reason:'Fixture'}).key,intent.key)
  assert.equal(pendingOperation(95,'adjust:17'),null)
  const changed=prepareOperation(94,'adjust:17',{userId:17,amount:50,reason:'Fixture'})
  assert.notEqual(changed.key,intent.key)
  completeOperation(94,'adjust:17',intent.key);assert.equal(pendingOperation(94,'adjust:17').key,changed.key)
  completeOperation(94,'adjust:17',changed.key);assert.equal(pendingOperation(94,'adjust:17'),null);checks+=5
  const operationRequests=[];let failOperation=true
  client.defaults.adapter=async config=>{operationRequests.push(config);if(failOperation)throw {config,message:'Fixture response lost'};return {status:200,statusText:'OK',headers:{},config,data:{success:true,data:{amount_delta:25}}}}
  const adjustmentProps={modelValue:true,user:{id:17,username:'Fixture reader',lightning_coins:50},onSave:({userId,amount,reason,operationKey})=>usersApi.adjustCoins(userId,amount,reason,operationKey)}
  const adjustmentIdentity={id:96,username:'Finance fixture',role:{name:'finance'},permissions:['coins:adjust']}
  const adjustment=await mount('/src/components/users/CoinsModal.vue',adjustmentProps,adjustmentIdentity)
  adjustment.state.reason.value='Fixture correction'
  await adjustment.state.handleSubmit()
  const restoredAdjustment=await mount('/src/components/users/CoinsModal.vue',adjustmentProps,adjustmentIdentity)
  assert.equal(restoredAdjustment.state.reason.value,'Fixture correction')
  assert.equal(restoredAdjustment.state.restoredIntent.value,true)
  failOperation=false;await restoredAdjustment.state.handleSubmit()
  assert.equal(operationRequests[0].headers['Idempotency-Key'],operationRequests[1].headers['Idempotency-Key'])
  assert.equal(operationRequests[1].timeout,120000)
  assert.equal(pendingOperation(96,'adjust:17'),null);checks+=5
  client.defaults.adapter=savedAdapter

  const session=await mount('/src/views/SessionsView.vue')
  await session.auth.logout()
  assert.equal(requests.at(-1).url,'/auth/logout')
  assert.equal(session.auth.isAuthenticated,false);checks+=2

  const logoutRace=await mount('/src/views/SessionsView.vue')
  logoutRace.auth.token='expired-access';logoutRace.auth.refreshToken='captured-refresh'
  localStorage.setItem('webtoonhub_staff_token','expired-access')
  localStorage.setItem('webtoonhub_staff_refresh_token','captured-refresh')
  let resolveLogout,logoutRequest
  client.defaults.adapter=async config=>{
    const response=data=>({status:200,statusText:'OK',headers:{},config,data:{success:true,data}})
    if(config.url==='/auth/logout'){
      logoutRequest=config
      return new Promise(resolve=>{resolveLogout=()=>resolve(response({}))})
    }
    if(config.url==='/auth/login') return response({access_token:'new-access',refresh_token:'new-refresh',staff:{username:'New login',role:{name:'editor'},permissions:[]}})
    return response(config.url==='/auth/me'?{username:'Regression',role:{name:'superadmin'},permissions:[]}:{items:[],total:0})
  }
  const revoking=logoutRace.auth.logout()
  await nextTick()
  assert.equal(logoutRequest.headers.Authorization,'Bearer expired-access')
  assert.equal(JSON.parse(logoutRequest.data).refresh_token,'captured-refresh')
  assert.equal(logoutRequest.timeout,5000);checks+=3
  await logoutRace.auth.login('new@example.com','fixture-password')
  assert.equal(localStorage.getItem('webtoonhub_staff_refresh_token'),'new-refresh');checks++
  resolveLogout();await revoking
  assert.equal(logoutRace.auth.token,'new-access')
  assert.equal(logoutRace.auth.staff.username,'New login')
  assert.equal(localStorage.getItem('webtoonhub_staff_token'),'new-access');checks+=3
  logoutRace.auth.clearSession()
  assert.equal(localStorage.getItem('webtoonhub_staff_refresh_token'),null);checks++

  for(const name of ['Dashboard','Webtoons','Moderation','Rbac','CreatorRequests','Users','Economy','Comments','Sessions','ClanManagement','WheelManagement','Shop']) {
    await mount(`/src/views/${name}View.vue`);checks++
  }

  // These checks reproduce the closed 375px sidebar and then exercise its open/close watchers.
  window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}})
  const mobile=await mountClient('/src/components/layout/Sidebar.vue',true)
  const sidebar=mobile.find(node=>node.props.id==='staff-sidebar')
  assert(sidebar)
  assert(sidebar.props.class.includes('max-lg:-translate-x-full'))
  assert(!sidebar.props.class.split(' ').includes('max-lg:translate-x-0'))
  assert.equal(sidebar.props.inert,true);checks+=4
  const trigger={isConnected:true,focus(){document.activeElement=this}}
  document.activeElement=trigger
  const previousGetElement=document.getElementById
  document.getElementById=id=>id==='staff-sidebar'?sidebar:null
  mobile.state.systemStore.setMobileMenu(true);await nextTick();await nextTick()
  assert(sidebar.props.class.split(' ').includes('max-lg:translate-x-0'))
  assert(!sidebar.props.class.includes('max-lg:-translate-x-full'))
  assert.equal(sidebar.props.inert,false)
  assert.equal(document.activeElement.tag,'button');checks+=4
  mobile.state.onMenuKeydown({key:'Escape',preventDefault(){}});await nextTick()
  assert.equal(mobile.state.systemStore.isMobileMenuOpen,false)
  assert.equal(document.activeElement,trigger)
  assert(sidebar.props.class.includes('max-lg:-translate-x-full'));checks+=3
  mobile.unmount();document.getElementById=previousGetElement
  for(const name of ['Dashboard','Webtoons','Moderation','Rbac','CreatorRequests','Users','Economy','Comments','Sessions','ClanManagement','WheelManagement','Shop']) {
    const mounted=await mountClient(`/src/views/${name}View.vue`)
    mounted.unmount();checks++
  }
  console.log(`${checks} staff regression checks passed: serialization, zero rewards, file order, paging, explicit role defaults, pending saves, retained drafts, modal rendering and all staff view rendering.`)
} finally { await server.close() }
