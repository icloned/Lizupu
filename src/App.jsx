import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { annotations, genealogyTree, sourceMeta } from './data/genealogy.js'

const flattenTree = (node, parentId = null, depth = 1, rows = []) => {
  rows.push({ id: node.id, title: node.title, parentId, depth, childIds: node.children.map((child) => child.id) })
  node.children.forEach((child) => flattenTree(child, node.id, depth + 1, rows))
  return rows
}

const sourceNodes = flattenTree(genealogyTree)
const sourceNodeMap = new Map(sourceNodes.map((node) => [node.id, node]))
const genealogyNodeMap = new Map()
const indexGenealogyTree = (node) => {
  genealogyNodeMap.set(node.id, node)
  node.children.forEach(indexGenealogyTree)
}
indexGenealogyTree(genealogyTree)
const defaultExpandedIds = (() => {
  const ids = new Set([genealogyTree.id])
  let current = genealogyTree
  for (let generation = 1; generation < 5; generation += 1) {
    const next = current.children.find((child) => child.children.length > 0)
    if (!next) break
    ids.add(next.id)
    current = next
  }
  return ids
})()
const orderWords = ['长', '次', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
const childOrderLabel = (index) => `${orderWords[index] || `${index + 1}`}子`
const fifteenthGenerationNodes = sourceNodes.filter((node) => node.depth === 15 && node.childIds.length > 0)
const branchesExpandTo16 = new Set(['长素', '振甲', '长荣', '长水'])
const branchesExpandTo17 = new Set(['长松', '长锦', '长友', '长清'])
const generationWords = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九']
const generationLabel = (generation) => generation >= 20 ? `廿${generation === 20 ? '' : generationWords[generation - 20]}世` : `${generationWords[generation]}世`
const generationIndexLabel = (generation) => generation >= 11 ? generationWords[generation] : generationLabel(generation)
const generationColors = ['#d98472', '#db8d70', '#dd976e', '#dfa16c', '#e0ab6b', '#d7a868', '#d1a467', '#caa064', '#c59b63', '#d09a68', '#d89a6c', '#df9a70']
const generationColor = (generation) => generationColors[(generation - 1) % generationColors.length]
const generationIndexWindow = () => {
  const start = Math.min(3, sourceMeta.maxDepth)
  const end = Math.min(12, sourceMeta.maxDepth)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
const formatPersonName = (title) => {
  const value = title.trim()
  const characters = Array.from(value)
  if (characters.length < 3) return value
  const spouseStart = value.includes('氏') ? (characters.length === 3 ? 1 : 2) : (characters.length >= 4 ? 2 : -1)
  return spouseStart > 0 ? `${characters.slice(0, spouseStart).join('')} · ${characters.slice(spouseStart).join('')}` : value
}
const formatPrimaryName = (title) => {
  const value = title.trim()
  const characters = Array.from(value)
  if (characters.length < 3) return value
  const spouseStart = value.includes('氏') ? (characters.length === 3 ? 1 : 2) : (characters.length >= 4 ? 2 : -1)
  return spouseStart > 0 ? characters.slice(0, spouseStart).join('') : value
}
const nodePath = (id) => {
  const path = []
  let current = sourceNodeMap.get(id)
  while (current) { path.unshift(current); current = current.parentId ? sourceNodeMap.get(current.parentId) : null }
  return path
}
const collectBranchIds = (node, ids = []) => {
  if (node.children.length > 0) ids.push(node.id)
  node.children.forEach((child) => collectBranchIds(child, ids))
  return ids
}
const deepestGeneration = (node, generation) => node.children.reduce((deepest, child) => Math.max(deepest, deepestGeneration(child, generation + 1)), generation)
const migrationNotes = annotations.filter((item) => item.title.startsWith('迁'))
const migrationByName = new Map([
  ['志茂冯氏', '迁陕西'], ['兰祥马桂英', '迁黑龙江'], ['兰惠葛氏', '迁黑龙江'], ['兰朋陈氏', '迁山西'], ['玉湖豆氏', '迁东北'],
  ['厚亮苗凤娥', '迁嘉祥'], ['玉允刘氏', '迁黑龙江'], ['登忠张氏', '迁黑龙江'], ['玉乾', '迁陕西大荔'], ['延如刘丽平', '迁云南昆明'],
])

const touchDistance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

const touchMidpoint = (touches) => ({ x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 })

const Icon = ({ name, size = 20 }) => {
  const paths = {
    home: 'M3 10.5 12 3l9 7.5V21H3zM9 21v-6h6v6',
    search: 'm20 20-4.5-4.5M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z',
    architecture: 'M12 4v4M12 8H6v4m6-4h6v4M6 12H4v5h4v-5m8 0h4v5h-4v-5M12 8v9h-2m2 0h2',
    route: 'M5 4h6l-2 4h7l-2 4h5M5 20h6l-2-4h7l-2-4h5',
    book: 'M4 5.5c3.2-1.8 6.4-1.5 8 1v13c-1.6-2.5-4.8-2.8-8-1V5.5Zm16 0c-3.2-1.8-6.4-1.5-8 1v13c1.6-2.5 4.8-2.8 8-1V5.5Z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c.7-4.2 3.3-6.2 8-6.2s7.3 2 8 6.2',
    back: 'm15 18-6-6 6-6',
    chevron: 'm9 18 6-6-6-6',
    map: 'M3 5.5 9 3l6 2.5L21 3v15.5l-6 2.5-6-2.5-6 2.5V5.5Zm6-2.3v15.2m6-12.9v15.2',
    edit: 'M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Zm8.5-13.5 4 4',
    correction: 'M5 4h10l4 4v12H5zM15 4v4h4M8 15l2 2 5-5',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

const Header = ({ title, onBack, action, hideBack = false }) => <header className={`topbar ${hideBack ? 'topbar-no-back' : ''}`.trim()}>
  {hideBack ? <span className="topbar-spacer" /> : <button className="icon-button" aria-label="返回" onClick={onBack}>{onBack ? <Icon name="back" /> : <span className="seal">李</span>}</button>}
  <h1>{title}</h1>
  {action || <span className="topbar-spacer" />}
</header>

const PageFrame = ({ children, className = '', pageRef }) => <main ref={pageRef} className={`app-shell ${className}`.trim()}>{children}</main>
function BottomNav({ active, go }) {
  const items = [['home', '全谱', 'book'], ['branches', '分支', 'architecture'], ['search', '查询', 'search'], ['correction', '纠错', 'edit']]
  return <nav className="bottom-nav">{items.map(([id, label, icon]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => go(id === 'home' ? 'tree' : id, id === 'branch' ? genealogyTree.id : undefined)}><span className="nav-icon"><Icon name={icon} size={19} /></span><span>{label}</span></button>)}</nav>
}

function BranchPage({ go, selectedId }) {
  const current = sourceNodeMap.get(selectedId) || sourceNodeMap.get(genealogyTree.id)
  const path = nodePath(current.id)
  const children = current.childIds.map((id) => sourceNodeMap.get(id))
  return <PageFrame><Header title="支系" onBack={() => go('tree')} action={<button className="icon-button" onClick={() => go('search')}><Icon name="search" /></button>} />
    <div className="page-content">
      <div className="breadcrumbs">{path.map((node, index) => <span className={index === path.length - 1 ? 'current' : ''} key={node.id}>{formatPersonName(node.title)}{index < path.length - 1 && <em>›</em>}</span>)}</div>
      <p className="eyeline">当前：{formatPersonName(current.title)} · 第 {current.depth} 层</p>
      <section className="timeline">{children.length > 0 ? children.map((child, index) => <div className="lineage-level" key={child.id}>
        <div className="generation"><b>{childOrderLabel(index)}</b></div>
        <button className="line-node" onClick={() => go('node', child.id)}><strong>{formatPersonName(child.title)}</strong><small>{child.childIds.length ? `下有 ${child.childIds.length} 人` : '暂无后代'}</small></button>
      </div>) : <p className="empty">暂无后代</p>}</section>
      {current.parentId && <button className="more-lineage" onClick={() => go('branch', current.parentId)}>返回上级节点 <Icon name="back" /></button>}
    </div><BottomNav active="home" go={go} />
  </PageFrame>
}

function BranchesPage({ go }) {
  const [selectedBranchId, setSelectedBranchId] = useState(fifteenthGenerationNodes[fifteenthGenerationNodes.length - 1]?.id || null)
  const [expandedIds, setExpandedIds] = useState(() => new Set([genealogyTree.id]))
  const [branchCenterRequestId, setBranchCenterRequestId] = useState(null)
  const branchViewportRef = useRef(null)
  const branchStageRef = useRef(null)
  const branchTransformRef = useRef({ scale: 1, x: 0, y: 0 })
  const branchGestureRef = useRef(null)
  const pendingBranchFitRef = useRef(null)
  const branchRoot = selectedBranchId ? genealogyNodeMap.get(selectedBranchId) : genealogyTree
  const isOverview = !selectedBranchId
  const directLineage = nodePath(branchRoot.id).slice(-7)
  const treeGeneration = isOverview ? 1 : 15
  const treeLimit = isOverview ? 15 : sourceMeta.maxDepth
  const branchName = formatPrimaryName(branchRoot.title)
  const branchEndGeneration = isOverview ? 6 : deepestGeneration(branchRoot, treeGeneration)
  const defaultExpandToGeneration = isOverview ? 6 : (branchesExpandTo16.has(branchName) ? 16 : (branchesExpandTo17.has(branchName) ? 17 : 19))
  const branchHighlightTo = isOverview ? null : branchEndGeneration
  const branchHighlightFrom = isOverview ? null : Math.max(17, branchHighlightTo - 4)
  const applyBranchTransform = () => {
    const stage = branchStageRef.current
    const view = branchTransformRef.current
    if (stage) stage.style.transform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`
  }
  const centerBranchRoot = () => {
    const viewport = branchViewportRef.current
    const stage = branchStageRef.current
    if (!viewport || !stage) return
    branchTransformRef.current = { scale: 1, x: 0, y: 0 }
    stage.style.transform = 'none'

    const cards = Array.from(stage.querySelectorAll('.home-tree-card'))
    if (cards.length === 0) return
    const viewportBounds = viewport.getBoundingClientRect()
    const stageBounds = stage.getBoundingClientRect()
    const cardBounds = cards.map((card) => card.getBoundingClientRect())
    const left = Math.min(...cardBounds.map((bounds) => bounds.left))
    const right = Math.max(...cardBounds.map((bounds) => bounds.right))
    const top = Math.min(...cardBounds.map((bounds) => bounds.top))
    const bottom = Math.max(...cardBounds.map((bounds) => bounds.bottom))
    const width = Math.max(1, right - left)
    const height = Math.max(1, bottom - top)
    const scale = Math.min(1, (viewportBounds.width - 12) / width, (viewportBounds.height - 16) / height)
    const targetLeft = viewportBounds.left + (viewportBounds.width - width * scale) / 2
    const targetTop = viewportBounds.top + 8

    branchTransformRef.current = {
      scale,
      x: targetLeft - stageBounds.left - (left - stageBounds.left) * scale,
      y: targetTop - stageBounds.top - (top - stageBounds.top) * scale,
    }
    applyBranchTransform()
  }
  const fitBranchNode = (nodeId) => {
    const viewport = branchViewportRef.current
    const stage = branchStageRef.current
    if (!viewport || !stage) return

    const treeNode = Array.from(stage.querySelectorAll('[data-home-tree-node]'))
      .find((element) => element.dataset.homeTreeNode === nodeId)
    const ancestorCards = []
    let ancestorNode = treeNode?.parentElement?.closest('[data-home-tree-node]')
    while (ancestorNode) {
      const ancestorCard = ancestorNode.firstElementChild
      if (ancestorCard?.classList.contains('home-tree-card')) ancestorCards.push(ancestorCard)
      ancestorNode = ancestorNode.parentElement?.closest('[data-home-tree-node]')
    }
    const cards = treeNode
      ? [...ancestorCards.reverse(), treeNode.firstElementChild, ...Array.from(treeNode.querySelectorAll('.home-tree-children .home-tree-card'))].filter(Boolean)
      : []

    if (!treeNode || cards.length === 0) {
      centerBranchRoot()
      return
    }

    branchTransformRef.current = { scale: 1, x: 0, y: 0 }
    stage.style.transform = 'none'

    const viewportBounds = viewport.getBoundingClientRect()
    const stageBounds = stage.getBoundingClientRect()
    const cardBounds = cards.map((card) => card.getBoundingClientRect())
    const left = Math.min(...cardBounds.map((bounds) => bounds.left))
    const right = Math.max(...cardBounds.map((bounds) => bounds.right))
    const top = Math.min(...cardBounds.map((bounds) => bounds.top))
    const bottom = Math.max(...cardBounds.map((bounds) => bounds.bottom))
    const width = Math.max(1, right - left)
    const height = Math.max(1, bottom - top)
    const availableWidth = Math.max(1, viewportBounds.width - 24)
    const availableHeight = Math.max(1, viewportBounds.height - 20)
    const scale = Math.min(1, availableWidth / width, availableHeight / height)
    const targetLeft = viewportBounds.left + (viewportBounds.width - width * scale) / 2
    const targetTop = viewportBounds.top + 8

    branchTransformRef.current = {
      scale,
      x: targetLeft - stageBounds.left - (left - stageBounds.left) * scale,
      y: targetTop - stageBounds.top - (top - stageBounds.top) * scale,
    }
    applyBranchTransform()
  }
  const handleBranchTouchStart = (event) => {
    if (branchStageRef.current) branchStageRef.current.style.transition = 'none'
    const view = branchTransformRef.current
    if (event.touches.length === 2) branchGestureRef.current = { type: 'pinch', distance: touchDistance(event.touches), midpoint: touchMidpoint(event.touches), ...view }
    else if (event.touches.length === 1) branchGestureRef.current = { type: 'pan', point: { x: event.touches[0].clientX, y: event.touches[0].clientY }, ...view }
  }
  const handleBranchTouchMove = (event) => {
    const gesture = branchGestureRef.current
    const viewport = branchViewportRef.current
    if (!gesture || !viewport) return
    event.preventDefault()
    if (gesture.type === 'pan' && event.touches.length === 1) {
      branchTransformRef.current = { scale: gesture.scale, x: gesture.x + event.touches[0].clientX - gesture.point.x, y: gesture.y + event.touches[0].clientY - gesture.point.y }
      applyBranchTransform()
      return
    }
    if (gesture.type !== 'pinch' || event.touches.length !== 2) return
    const midpoint = touchMidpoint(event.touches)
    const scale = Math.min(1.45, Math.max(.25, gesture.scale * (touchDistance(event.touches) / gesture.distance)))
    const bounds = viewport.getBoundingClientRect()
    const startX = gesture.midpoint.x - bounds.left
    const startY = gesture.midpoint.y - bounds.top
    const currentX = midpoint.x - bounds.left
    const currentY = midpoint.y - bounds.top
    const contentX = (startX - gesture.x) / gesture.scale
    const contentY = (startY - gesture.y) / gesture.scale
    branchTransformRef.current = { scale, x: currentX - contentX * scale, y: currentY - contentY * scale }
    applyBranchTransform()
  }
  const resetBranchGesture = () => { branchGestureRef.current = null }
  useEffect(() => {
    const targetGeneration = defaultExpandToGeneration
    const ids = new Set()
    const expandTo = (node, generation) => {
      if (generation >= targetGeneration || node.children.length === 0) return
      ids.add(node.id)
      node.children.forEach((child) => expandTo(child, generation + 1))
    }
    expandTo(branchRoot, treeGeneration)
    setExpandedIds(ids)
    setBranchCenterRequestId(branchRoot.id)
  }, [branchRoot.id, isOverview, treeGeneration, defaultExpandToGeneration])
  useLayoutEffect(() => {
    if (branchCenterRequestId !== branchRoot.id) return undefined
    const frame = requestAnimationFrame(centerBranchRoot)
    return () => cancelAnimationFrame(frame)
  }, [branchCenterRequestId, branchRoot.id])
  useLayoutEffect(() => {
    const nodeId = pendingBranchFitRef.current
    if (!nodeId) return undefined
    pendingBranchFitRef.current = null
    const frame = requestAnimationFrame(() => fitBranchNode(nodeId))
    return () => cancelAnimationFrame(frame)
  }, [expandedIds])
  const toggleBranchNode = (id, generation, centerAfterExpand) => {
    const node = genealogyNodeMap.get(id)
    const parentId = node?.parentId
    const parentIsInCurrentBranch = parentId && nodePath(parentId).some((ancestor) => ancestor.id === branchRoot.id)
    pendingBranchFitRef.current = centerAfterExpand
      ? id
      : (parentIsInCurrentBranch ? parentId : branchRoot.id)

    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  return <PageFrame className="tree-page-shell"><Header title="支系" onBack={() => go('tree')} hideBack />
    <div className="branch-tabs" role="tablist" aria-label="支系选择">
      <div className="branch-overview-tab"><button className={isOverview ? 'active' : ''} onClick={() => setSelectedBranchId(null)} role="tab" aria-selected={isOverview}>总世系</button></div>
      <div className="branch-generation-tabs">{[...fifteenthGenerationNodes].reverse().map((node) => <button key={node.id} className={selectedBranchId === node.id ? 'active' : ''} onClick={() => setSelectedBranchId(node.id)} role="tab" aria-selected={selectedBranchId === node.id}>{formatPrimaryName(node.title)}</button>)}</div>
    </div><div className="branch-scroll-hint">← 左右滑动查看更多 →</div><div className="branch-lineage-path" aria-label="当前支系直系">{directLineage.map((node, index) => <span key={node.id} className={index === directLineage.length - 1 ? 'current' : ''}>{formatPrimaryName(node.title).replace(/[{}]/g, '')}{index < directLineage.length - 1 && <b>›</b>}</span>)}</div>
    <div className="page-content full-tree branch-tree"><div ref={branchViewportRef} className="branch-tree-viewport" onTouchStart={handleBranchTouchStart} onTouchMove={handleBranchTouchMove} onTouchEnd={resetBranchGesture} onTouchCancel={resetBranchGesture}><div ref={branchStageRef} className="branch-tree-stage"><div className="branch-highlight-box"><div className="home-tree"><HomeTreeNode node={branchRoot} generation={treeGeneration} generationLimit={treeLimit} focusedNodeId={branchRoot.id} expandedIds={expandedIds} onToggle={toggleBranchNode} onFocusNode={() => {}} bulkExpandFromGeneration={20} branchHighlightFrom={branchHighlightFrom} branchHighlightTo={branchHighlightTo} toggleOnName toggleOnGeneration={formatPrimaryName(branchRoot.title) === '长素'} /></div></div></div></div></div>
    <BottomNav active="branches" go={go} />
  </PageFrame>
}

function PersonPage({ go, selectedId }) {
  const current = sourceNodeMap.get(selectedId) || sourceNodeMap.get(genealogyTree.id)
  const parent = current.parentId ? sourceNodeMap.get(current.parentId) : null
  const children = current.childIds.map((id) => sourceNodeMap.get(id))
  return <PageFrame className="tree-page-shell"><Header title="人物" hideBack action={<button className="icon-button" onClick={() => go('search')}><Icon name="search" /></button>} />
    <div className="page-content person-page">
      <div className="person-identity"><div className="word-medallion">李</div><div><h2>{formatPersonName(current.title)}</h2><p>{generationLabel(current.depth)}</p></div></div>
      <section className="local-tree"><BloodlineTree current={current} parent={parent} children={children} go={go} /></section>
    </div><BottomNav active="home" go={go} />
  </PageFrame>
}

function BloodlineTree({ current, parent, children, go }) {
  const orderedChildren = children.map((node) => genealogyNodeMap.get(node.id) || node)
  const grandparent = parent?.parentId ? sourceNodeMap.get(parent.parentId) : null
  const ancestorChain = [grandparent, parent, current].filter(Boolean)
  const buildChain = (node, index) => ({ ...(genealogyNodeMap.get(node.id) || node), children: index === ancestorChain.length - 1 ? orderedChildren : (ancestorChain[index + 1] ? [buildChain(ancestorChain[index + 1], index + 1)] : []) })
  const root = buildChain(ancestorChain[0] || current, 0)
  const rootGeneration = ancestorChain[0]?.depth || current.depth
  const getDefaultExpandedIds = () => {
    const ids = new Set([root?.id, parent?.id, current.id].filter(Boolean))
    const expandDescendants = (node, generation) => {
      if (generation >= current.depth + 2 || node.children.length === 0) return
      ids.add(node.id)
      node.children.forEach((child) => expandDescendants(child, generation + 1))
    }
    expandDescendants(root || current, rootGeneration)
    return ids
  }
  const [expandedIds, setExpandedIds] = useState(getDefaultExpandedIds)
  const viewportRef = useRef(null)
  const stageRef = useRef(null)
  const transformRef = useRef({ scale: 1, x: 0, y: 0 })
  const gestureRef = useRef(null)
  const pendingFocusIdRef = useRef(null)
  const focusAnimationTimerRef = useRef(null)
  const applyTransform = () => {
    const stage = stageRef.current
    const view = transformRef.current
    if (stage) stage.style.transform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`
  }
  const centerPersonNode = (nodeId, animate = false) => {
    const viewport = viewportRef.current
    const stage = stageRef.current
    if (!viewport || !stage) return
    const treeNode = Array.from(viewport.querySelectorAll('[data-home-tree-node]')).find((item) => item.dataset.homeTreeNode === nodeId)
    const card = treeNode?.firstElementChild
    if (!card) return

    if (focusAnimationTimerRef.current) window.clearTimeout(focusAnimationTimerRef.current)
    stage.style.transition = animate ? 'transform 260ms cubic-bezier(.22, .8, .24, 1)' : 'none'
    const viewportBounds = viewport.getBoundingClientRect()
    const cardBounds = card.getBoundingClientRect()
    const view = transformRef.current
    transformRef.current = {
      ...view,
      x: view.x + viewportBounds.left + viewportBounds.width / 2 - cardBounds.left - cardBounds.width / 2,
      y: view.y + viewportBounds.top + 28 - cardBounds.top - cardBounds.height / 2,
    }
    applyTransform()
    if (animate) focusAnimationTimerRef.current = window.setTimeout(() => { if (stageRef.current) stageRef.current.style.transition = 'none' }, 280)
  }
  const fitPersonTree = () => {
    const viewport = viewportRef.current
    const stage = stageRef.current
    if (!viewport || !stage) return
    transformRef.current = { scale: 1, x: 0, y: 0 }
    stage.style.transform = 'none'
    const tree = stage.querySelector('.home-tree')
    if (!tree || !tree.offsetWidth || !tree.offsetHeight) return

    const viewportBounds = viewport.getBoundingClientRect()
    const treeBounds = tree.getBoundingClientRect()
    const availableWidth = Math.max(1, viewportBounds.width - 8)
    const availableHeight = Math.max(1, viewportBounds.height - 12)
    const scale = Math.min(1, availableWidth / treeBounds.width, availableHeight / treeBounds.height)
    transformRef.current = {
      scale,
      x: viewportBounds.left + (viewportBounds.width - treeBounds.width * scale) / 2 - treeBounds.left,
      y: viewportBounds.top + 6 - treeBounds.top,
    }
    applyTransform()
  }
  const fitViewportToNavigation = () => {
    const viewport = viewportRef.current
    const navigation = viewport?.closest('.app-shell')?.querySelector('.bottom-nav')
    if (!viewport || !navigation) return
    const availableHeight = navigation.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 12
    viewport.style.height = `${Math.max(0, Math.floor(availableHeight))}px`
  }
  useLayoutEffect(() => {
    setExpandedIds(getDefaultExpandedIds())
    const updateViewport = () => fitViewportToNavigation()
    const frame = requestAnimationFrame(() => {
      updateViewport()
      fitPersonTree()
    })
    window.addEventListener('resize', updateViewport)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateViewport)
    }
  }, [current.id])
  useLayoutEffect(() => {
    const nodeId = pendingFocusIdRef.current
    if (!nodeId) return undefined
    pendingFocusIdRef.current = null
    const frame = requestAnimationFrame(() => centerPersonNode(nodeId, true))
    return () => cancelAnimationFrame(frame)
  }, [expandedIds])
  useEffect(() => () => { if (focusAnimationTimerRef.current) window.clearTimeout(focusAnimationTimerRef.current) }, [])
  const toggleNode = (id, generation, centerAfterExpand) => {
    if (centerAfterExpand) pendingFocusIdRef.current = id
    setExpandedIds((existing) => {
      const next = new Set(existing)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const handleTouchStart = (event) => {
    if (focusAnimationTimerRef.current) window.clearTimeout(focusAnimationTimerRef.current)
    if (stageRef.current) stageRef.current.style.transition = 'none'
    const view = transformRef.current
    if (event.touches.length === 2) gestureRef.current = { type: 'pinch', distance: touchDistance(event.touches), midpoint: touchMidpoint(event.touches), ...view }
    else if (event.touches.length === 1) gestureRef.current = { type: 'pan', point: { x: event.touches[0].clientX, y: event.touches[0].clientY }, ...view }
  }
  const handleTouchMove = (event) => {
    const gesture = gestureRef.current
    const viewport = viewportRef.current
    if (!gesture || !viewport) return
    event.preventDefault()
    if (gesture.type === 'pan' && event.touches.length === 1) {
      transformRef.current = { scale: gesture.scale, x: gesture.x + event.touches[0].clientX - gesture.point.x, y: gesture.y + event.touches[0].clientY - gesture.point.y }
      applyTransform()
      return
    }
    if (gesture.type !== 'pinch' || event.touches.length !== 2) return
    const midpoint = touchMidpoint(event.touches)
    const scale = Math.min(1.45, Math.max(.25, gesture.scale * (touchDistance(event.touches) / gesture.distance)))
    const bounds = viewport.getBoundingClientRect()
    const startX = gesture.midpoint.x - bounds.left
    const startY = gesture.midpoint.y - bounds.top
    const currentX = midpoint.x - bounds.left
    const currentY = midpoint.y - bounds.top
    const contentX = (startX - gesture.x) / gesture.scale
    const contentY = (startY - gesture.y) / gesture.scale
    transformRef.current = { scale, x: currentX - contentX * scale, y: currentY - contentY * scale }
    applyTransform()
  }
  const resetGesture = () => { gestureRef.current = null }
  return <div ref={viewportRef} className="person-tree-viewport" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={resetGesture} onTouchCancel={resetGesture}><div ref={stageRef} className="person-tree-stage"><div className="full-tree person-window-tree"><div className="home-tree"><HomeTreeNode node={root || current} generation={rootGeneration} generationLimit={current.depth + 2} focusedNodeId={current.id} expandedIds={expandedIds} onToggle={toggleNode} onFocusNode={(nodeId) => go('node', nodeId)} /></div></div></div></div>
}

function SearchPage({ go }) {
  const [query, setQuery] = useState('')
  const [depth, setDepth] = useState('')
  const [depthOpen, setDepthOpen] = useState(false)
  const filtered = useMemo(() => sourceNodes.filter((node) => node.title.includes(query.trim()) && (!depth || String(node.depth) === depth)), [query, depth])
  const groupedResults = useMemo(() => {
    const groups = new Map()
    filtered.forEach((node) => {
      const members = groups.get(node.depth) || []
      members.push(node)
      groups.set(node.depth, members)
    })
    return [...groups.entries()].sort(([left], [right]) => left - right)
  }, [filtered])
  return <PageFrame className="tree-page-shell"><Header title="查询" hideBack />
    <div className="page-content search-page"><div className="search-controls"><label className="search-box"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="查询姓名" /></label>
      <div className="search-toolbar"><div className="filters"><div className="generation-picker"><button type="button" className="generation-picker-trigger" onClick={() => setDepthOpen((open) => !open)}>{depth ? generationLabel(Number(depth)) : '全部世系'}<Icon name="chevron" size={16} /></button>{depthOpen && <div className="generation-picker-menu">{[['', '全部世系'], ...Array.from({ length: sourceMeta.maxDepth }, (_, index) => [String(index + 1), generationLabel(index + 1)])].map(([value, label]) => <button type="button" key={value || 'all'} className={depth === value ? 'active' : ''} onClick={() => { setDepth(value); setDepthOpen(false) }}>{label}</button>)}</div>}</div></div><p className="sample-note">共 {filtered.length} 人</p></div></div>
      <div className="search-result-groups">{groupedResults.map(([generation, members]) => <section className="search-result-group" key={generation}><h2>{generationLabel(generation)}<small>{members.length} 人</small></h2><div className="result-list">{members.map((node) => <button key={node.id} onClick={() => go('node', node.id)}><span className="avatar">李</span><div><b>{formatPersonName(node.title)}</b><small>{generationLabel(node.depth)}</small></div><Icon name="chevron" /></button>)}</div></section>)}{filtered.length === 0 && <p className="empty">没有符合条件的成员</p>}</div>
    </div><BottomNav active="search" go={go} />
  </PageFrame>
}

function RulesPage({ go }) { return <PageFrame><Header title="派字规则" onBack={() => go('tree')} /><div className="page-content rules-page"><div className="rule-divider">◆</div><section className="rule-explain source-rule"><b>本族公议起名拾字</b>{sourceMeta.generationRule.split('\n').slice(1).map((line) => <p key={line}>{line}</p>)}</section></div><BottomNav active="rules" go={go} /></PageFrame> }

function MigrationPage({ go }) { return <PageFrame><Header title="迁徙记录" onBack={() => go('tree')} /><div className="page-content migration-page"><p className="sample-note">迁徙地点</p><div className="migration-list">{migrationNotes.map((note, index) => <div key={note.id}><i></i><b>记录 {index + 1}</b><h3>{note.title}</h3></div>)}</div></div><BottomNav active="annotations" go={go} /></PageFrame> }

function CorrectionPage({ go }) {
  const [submitter, setSubmitter] = useState('')
  const [content, setContent] = useState('')
  const [corrections, setCorrections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [passwordModal, setPasswordModal] = useState(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const apiUrl = './api/corrections.php'
  const request = async (method, body) => {
    const response = await fetch(apiUrl, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `请求失败（${response.status}）`)
    return result
  }
  useEffect(() => {
    request('GET').then((result) => setCorrections(result.items || [])).catch((reason) => setError(reason.message)).finally(() => setLoading(false))
  }, [])
  const refreshCaptcha = async () => { setCaptchaAnswer(''); try { const response = await fetch('./api/captcha.php'); const result = await response.json(); if (!response.ok) throw new Error(result.error || `请求失败（${response.status}）`); setCaptchaQuestion(result.captcha || '') } catch (reason) { setError(reason.message) } }
  useEffect(() => { refreshCaptcha() }, [])
  const submitCorrection = async (event) => {
    event.preventDefault()
    const name = submitter.trim()
    const text = content.trim()
    if (!name || !text) return
    setError('')
    try {
      const result = await request('POST', { action: 'create', submitter: name, content: text, captcha: captchaAnswer.trim() })
      setCorrections((current) => [result.item, ...current])
      setSubmitter(''); setContent(''); setCaptchaAnswer(''); refreshCaptcha()
    } catch (reason) { setError(reason.message) }
  }
  const updateStatus = (id, status) => { setPassword(''); setPasswordError(''); setPasswordModal({ action: 'update', id, status }) }
  const removeCorrection = (id) => { setPassword(''); setPasswordError(''); setPasswordModal({ action: 'delete', id }) }
  const confirmProtectedAction = async (event) => {
    event.preventDefault()
    if (!passwordModal || !password) return
    setPasswordError(''); setError('')
    try {
      const result = await request('POST', { ...passwordModal, password })
      if (passwordModal.action === 'delete') setCorrections((current) => current.filter((item) => item.id !== passwordModal.id))
      else setCorrections((current) => current.map((item) => item.id === passwordModal.id ? result.item : item))
      setPasswordModal(null); setPassword('')
    } catch (reason) { setPasswordError(reason.message) }
  }
  return <PageFrame className="tree-page-shell"><Header title="纠错" hideBack /><div className="page-content correction-page">
    <form className="correction-form" onSubmit={submitCorrection}><label>提交人姓名<input value={submitter} onChange={(event) => setSubmitter(event.target.value)} placeholder="请输入姓名" required /></label><label>纠错内容<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="请描述需要核对的族谱信息" rows="4" required /></label><label>验证码<div className="captcha-row"><input value={captchaAnswer} onChange={(event) => setCaptchaAnswer(event.target.value)} placeholder={captchaQuestion || '加载中'} required /><button type="button" onClick={refreshCaptcha}>换一题</button></div></label><button type="submit">提交纠错</button></form>
    {error && <p className="correction-error">{error}</p>}<section className="correction-list"><div className="correction-list-heading"><h3>纠错列表</h3><span>{corrections.length} 条</span></div>{loading ? <p className="correction-empty">正在加载</p> : corrections.length === 0 ? <p className="correction-empty">暂时没有提交记录</p> : corrections.map((item) => <article className={`correction-item is-${item.status}`} key={item.id}><div className="correction-item-meta"><b>{item.submitter}</b><time>{item.submittedAt}</time><em>{item.status === 'archived' ? '已归档' : item.status === 'repaired' ? '已修复' : '待处理'}</em></div><p>{item.content}</p><div className="correction-actions"><button type="button" onClick={() => updateStatus(item.id, 'repaired')}>已修复</button><button type="button" onClick={() => removeCorrection(item.id)}>删除</button></div></article>)}</section>
  </div>{passwordModal && <div className="password-modal-backdrop" role="presentation"><form className="password-modal" onSubmit={confirmProtectedAction}><h3>验证操作密码</h3><p>请输入密码后继续操作</p><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="操作密码" autoFocus /><>{passwordError && <span className="password-modal-error">{passwordError}</span>}</><div><button type="button" onClick={() => setPasswordModal(null)}>取消</button><button type="submit">确定</button></div></form></div>}<BottomNav active="correction" go={go} /></PageFrame>
}

function GenerationRuleNote() {
  return <details className="generation-rule-note"><summary><strong>本族公议起名拾字</strong></summary><div><span>自二十世始：厚德延美誉 树君越本兴</span><span>自三十世始：运来同科仲 耀宗显功成</span></div></details>
}

function TreePage({ go }) {
  const [activeGeneration, setActiveGeneration] = useState(1)
  const [expandedIds, setExpandedIds] = useState(() => new Set(defaultExpandedIds))
  const [focusedNodeId, setFocusedNodeId] = useState(null)
  const treeViewportRef = useRef(null)
  const treeStageRef = useRef(null)
  const viewTransformRef = useRef({ scale: 1, x: 0, y: 0 })
  const gestureRef = useRef(null)
  const pendingFocusIdRef = useRef(null)
  const focusAnimationTimerRef = useRef(null)
  const generationWindow = generationIndexWindow()
  const generationLimit = sourceMeta.maxDepth
  const applyViewTransform = () => {
    const stage = treeStageRef.current
    const view = viewTransformRef.current
    if (stage) stage.style.transform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`
  }
  const centerTreeNode = (nodeId, animate = false) => {
    const viewport = treeViewportRef.current
    const stage = treeStageRef.current
    if (!viewport || !stage) return
    const treeNode = Array.from(viewport.querySelectorAll('[data-home-tree-node]')).find((item) => item.dataset.homeTreeNode === nodeId)
    const card = treeNode?.firstElementChild
    if (!card) return

    if (focusAnimationTimerRef.current) window.clearTimeout(focusAnimationTimerRef.current)
    stage.style.transition = animate ? 'transform 260ms cubic-bezier(.22, .8, .24, 1)' : 'none'
    const viewportBounds = viewport.getBoundingClientRect()
    const cardBounds = card.getBoundingClientRect()
    const view = viewTransformRef.current
    viewTransformRef.current = {
      ...view,
      x: view.x + viewportBounds.left + viewportBounds.width / 2 - cardBounds.left - cardBounds.width / 2,
      y: view.y + viewportBounds.top + 28 - cardBounds.top - cardBounds.height / 2,
    }
    applyViewTransform()
    if (animate) focusAnimationTimerRef.current = window.setTimeout(() => { if (treeStageRef.current) treeStageRef.current.style.transition = 'none' }, 280)
  }
  const fitTreeNode = (nodeId) => {
    const viewport = treeViewportRef.current
    const stage = treeStageRef.current
    if (!viewport || !stage) return

    const treeNode = Array.from(stage.querySelectorAll('[data-home-tree-node]'))
      .find((element) => element.dataset.homeTreeNode === nodeId)
    const ancestorCards = []
    let ancestorNode = treeNode?.parentElement?.closest('[data-home-tree-node]')
    while (ancestorNode) {
      const ancestorCard = ancestorNode.firstElementChild
      if (ancestorCard?.classList.contains('home-tree-card')) ancestorCards.push(ancestorCard)
      ancestorNode = ancestorNode.parentElement?.closest('[data-home-tree-node]')
    }
    const cards = treeNode
      ? [...ancestorCards.reverse(), treeNode.firstElementChild, ...Array.from(treeNode.querySelectorAll('.home-tree-children .home-tree-card'))].filter(Boolean)
      : []
    if (!treeNode || cards.length === 0) return

    viewTransformRef.current = { scale: 1, x: 0, y: 0 }
    stage.style.transition = 'none'
    stage.style.transform = 'none'

    const viewportBounds = viewport.getBoundingClientRect()
    const stageBounds = stage.getBoundingClientRect()
    const cardBounds = cards.map((card) => card.getBoundingClientRect())
    const left = Math.min(...cardBounds.map((bounds) => bounds.left))
    const right = Math.max(...cardBounds.map((bounds) => bounds.right))
    const top = Math.min(...cardBounds.map((bounds) => bounds.top))
    const bottom = Math.max(...cardBounds.map((bounds) => bounds.bottom))
    const width = Math.max(1, right - left)
    const height = Math.max(1, bottom - top)
    const scale = Math.min(1, (viewportBounds.width - 24) / width, (viewportBounds.height - 20) / height)
    const targetLeft = viewportBounds.left + (viewportBounds.width - width * scale) / 2
    const targetTop = viewportBounds.top + 8

    viewTransformRef.current = {
      scale,
      x: targetLeft - stageBounds.left - (left - stageBounds.left) * scale,
      y: targetTop - stageBounds.top - (top - stageBounds.top) * scale,
    }
    applyViewTransform()
  }
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => centerTreeNode(genealogyTree.id))
    return () => cancelAnimationFrame(frame)
  }, [])
  useLayoutEffect(() => {
    const nodeId = pendingFocusIdRef.current
    if (!nodeId) return undefined
    pendingFocusIdRef.current = null
    const frame = requestAnimationFrame(() => fitTreeNode(nodeId))
    return () => cancelAnimationFrame(frame)
  }, [expandedIds, focusedNodeId])
  useEffect(() => () => { if (focusAnimationTimerRef.current) window.clearTimeout(focusAnimationTimerRef.current) }, [])
  const focusGeneration = (generation) => {
    setActiveGeneration(generation)
    const targetNode = sourceNodes.find((node) => node.depth === generation)
    if (targetNode) {
      pendingFocusIdRef.current = targetNode.id
      setFocusedNodeId(targetNode.id)
      setExpandedIds(new Set(sourceNodes.filter((node) => node.depth < generation && node.childIds.length > 0).map((node) => node.id)))
    }
  }
  const toggleNode = (id, generation, centerAfterExpand) => {
    const node = genealogyNodeMap.get(id)
    pendingFocusIdRef.current = centerAfterExpand ? id : (node?.parentId || genealogyTree.id)
    setExpandedIds((current) => {
      const next = new Set(current)
      const ids = generation >= 19 && node ? collectBranchIds(node) : [id]
      if (next.has(id)) ids.forEach((branchId) => next.delete(branchId))
      else ids.forEach((branchId) => next.add(branchId))
      return next
    })
  }
  const focusNode = (nodeId) => {
    const node = sourceNodeMap.get(nodeId)
    if (!node) return
    pendingFocusIdRef.current = node.id
    setFocusedNodeId(node.id)
    setActiveGeneration(node.depth)
  }
  const handleTreeTouchStart = (event) => {
    if (focusAnimationTimerRef.current) window.clearTimeout(focusAnimationTimerRef.current)
    if (treeStageRef.current) treeStageRef.current.style.transition = 'none'
    const view = viewTransformRef.current
    if (event.touches.length === 2) {
      gestureRef.current = { type: 'pinch', distance: touchDistance(event.touches), midpoint: touchMidpoint(event.touches), ...view }
    } else if (event.touches.length === 1) {
      gestureRef.current = { type: 'pan', point: { x: event.touches[0].clientX, y: event.touches[0].clientY }, ...view }
    }
  }
  const handleTreeTouchMove = (event) => {
    const gesture = gestureRef.current
    const viewport = treeViewportRef.current
    if (!gesture || !viewport) return
    event.preventDefault()
    if (gesture.type === 'pan' && event.touches.length === 1) {
      viewTransformRef.current = { scale: gesture.scale, x: gesture.x + event.touches[0].clientX - gesture.point.x, y: gesture.y + event.touches[0].clientY - gesture.point.y }
      applyViewTransform()
      return
    }
    if (gesture.type !== 'pinch' || event.touches.length !== 2) return
    const midpoint = touchMidpoint(event.touches)
    const scale = Math.min(1.45, Math.max(.25, gesture.scale * (touchDistance(event.touches) / gesture.distance)))
    const bounds = viewport.getBoundingClientRect()
    const startX = gesture.midpoint.x - bounds.left
    const startY = gesture.midpoint.y - bounds.top
    const currentX = midpoint.x - bounds.left
    const currentY = midpoint.y - bounds.top
    const contentX = (startX - gesture.x) / gesture.scale
    const contentY = (startY - gesture.y) / gesture.scale
    viewTransformRef.current = { scale, x: currentX - contentX * scale, y: currentY - contentY * scale }
    applyViewTransform()
  }
  const resetGesture = () => { gestureRef.current = null }
  return <PageFrame className="tree-page-shell full-tree-page"><Header title={sourceMeta.mapTitle} hideBack /><div className="page-content full-tree"><GenerationRuleNote /><div ref={treeViewportRef} className="home-tree-viewport" onTouchStart={handleTreeTouchStart} onTouchMove={handleTreeTouchMove} onTouchEnd={resetGesture} onTouchCancel={resetGesture}><div ref={treeStageRef} className="home-tree-stage"><div className="home-tree"><HomeTreeNode node={genealogyTree} generation={1} generationLimit={generationLimit} focusedNodeId={focusedNodeId} expandedIds={expandedIds} onToggle={toggleNode} onFocusNode={focusNode} toggleOnName rawName /></div></div></div></div><BottomNav active="home" go={go} /></PageFrame>
}
function HomeTreeNode({ node, generation, generationLimit, focusedNodeId, expandedIds, onToggle, onFocusNode, inheritedMigration, bulkExpandFromGeneration, branchHighlightFrom, branchHighlightTo, toggleOnName = false, toggleOnGeneration = false, reverseChildren = false, rawName = false }) {
  const hasChildren = node.children.length > 0
  const hasVisibleChildren = hasChildren && generation < generationLimit
  const isExpanded = expandedIds.has(node.id)
  const childrenRef = useRef(null)
  const migration = migrationByName.get(node.title.trim())
  const branchMigration = migration || inheritedMigration
  const isBranchDepthHighlight = branchHighlightFrom != null && generation >= branchHighlightFrom && generation <= branchHighlightTo
  const style = { '--generation-color': generationColor(generation), '--person-arrow-color': branchMigration ? '#813a65' : '#b84c35' }
  const focusNode = () => onFocusNode?.(node.id)
  const toggleNode = (event) => {
    event.preventDefault()
    event.stopPropagation()
    focusNode()
    onToggle(node.id, generation, !isExpanded)
  }
  const handleNameClick = (event) => {
    if ((toggleOnName || focusedNodeId === node.id || (bulkExpandFromGeneration && generation >= bulkExpandFromGeneration)) && hasVisibleChildren) toggleNode(event)
    else focusNode()
  }
  const handleGenerationClick = (event) => {
    if (toggleOnGeneration && generation >= 20 && hasVisibleChildren) toggleNode(event)
  }
  useLayoutEffect(() => {
    const children = childrenRef.current
    if (!children || !isExpanded || !hasVisibleChildren || node.children.length < 2) return undefined
    const updateConnectorBounds = () => {
      const childNodes = Array.from(children.children)
      const firstCard = childNodes[0]?.firstElementChild
      const lastCard = childNodes.at(-1)?.firstElementChild
      if (!firstCard || !lastCard || !children.offsetWidth) return

      const bounds = children.getBoundingClientRect()
      const scale = bounds.width / children.offsetWidth || 1
      const firstBounds = firstCard.getBoundingClientRect()
      const lastBounds = lastCard.getBoundingClientRect()
      const left = Math.max(0, (firstBounds.left + firstBounds.width / 2 - bounds.left) / scale)
      const right = Math.max(0, (bounds.right - lastBounds.left - lastBounds.width / 2) / scale)
      children.style.setProperty('--connector-left', `${left}px`)
      children.style.setProperty('--connector-right', `${right}px`)
    }
    updateConnectorBounds()
    const resizeObserver = new ResizeObserver(updateConnectorBounds)
    resizeObserver.observe(children)
    Array.from(children.children).forEach((child) => resizeObserver.observe(child))
    return () => resizeObserver.disconnect()
  }, [hasVisibleChildren, isExpanded, node.children.length, node.id])
  const children = reverseChildren ? [...node.children].reverse() : node.children
  return <div data-home-tree-node={node.id} data-tree-generation={generation} className={`home-tree-node ${isExpanded ? 'is-expanded' : ''} ${focusedNodeId === node.id ? 'tree-family-focus' : ''}`} style={style}>
    <div className="home-tree-card">
      {toggleOnGeneration && generation >= 20 ? <button className="tree-generation tree-generation-toggle" type="button" onClick={handleGenerationClick}>{generationLabel(generation)}</button> : <span className="tree-generation">{generationLabel(generation)}</span>}
      <button className={`tree-person-name ${branchMigration ? 'is-migrated' : ''} ${isBranchDepthHighlight ? 'branch-depth-highlight' : ''}`} type="button" onClick={handleNameClick}>{rawName ? node.title.trim() : formatPersonName(node.title)}{migration && <span className="tree-migration">（{migration}）</span>}</button>
      {hasVisibleChildren ? <sup className="tree-descendant-count">{node.children.length}</sup> : null}
      {hasVisibleChildren ? <button className={`tree-toggle-button ${isExpanded ? 'is-collapse' : 'is-expand'}`} type="button" aria-label={`${formatPersonName(node.title)}后代`} onClick={toggleNode}>{isExpanded ? '-' : '+ 展开'}</button> : null}
    </div>
    {hasVisibleChildren && isExpanded ? <div ref={childrenRef} className={`home-tree-children ${node.children.length === 1 ? 'is-single-child' : ''}`}>{children.map((child) => <HomeTreeNode key={child.id} node={child} generation={generation + 1} generationLimit={generationLimit} focusedNodeId={focusedNodeId} expandedIds={expandedIds} onToggle={onToggle} onFocusNode={onFocusNode} inheritedMigration={branchMigration} bulkExpandFromGeneration={bulkExpandFromGeneration} branchHighlightFrom={branchHighlightFrom} branchHighlightTo={branchHighlightTo} toggleOnName={toggleOnName} toggleOnGeneration={toggleOnGeneration} reverseChildren={reverseChildren} rawName={rawName} />)}</div> : null}
  </div>
}
function TreeNode({ node, generation, generationLimit, focusedNodeId, inheritedMigration, expandedIds, onToggle, onFocusNode, bulkExpandFromGeneration, branchHighlightFrom, branchHighlightTo, toggleOnName, toggleOnGeneration, reverseChildren = true, rawName = false }) {
  const hasChildren = node.children.length > 0
  const hasVisibleChildren = hasChildren && generation < generationLimit
  const isExpanded = expandedIds.has(node.id)
  const migration = migrationByName.get(node.title.trim())
  const branchMigration = migration || inheritedMigration
  const className = `full-tree-node ${generation === 1 ? 'tree-root' : ''} ${focusedNodeId === node.id ? 'tree-family-focus' : ''}`
  const style = { '--generation-color': generationColor(generation), '--person-arrow-color': branchMigration ? '#813a65' : '#b84c35' }
  const centerExpandedNode = (target) => requestAnimationFrame(() => {
    target.closest('[data-tree-generation]')?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  })
  const handleNameClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if ((toggleOnName || focusedNodeId === node.id || (bulkExpandFromGeneration && generation >= bulkExpandFromGeneration)) && hasVisibleChildren) {
      if (focusedNodeId !== node.id) onFocusNode?.(node.id)
      if (!isExpanded) centerExpandedNode(event.currentTarget)
      onToggle(node.id, generation)
    }
    else onFocusNode?.(node.id)
  }
  const handleToggleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isExpanded) centerExpandedNode(event.currentTarget)
    onFocusNode?.(node.id)
    onToggle(node.id, generation)
  }
  const handleGenerationClick = (event) => {
    if (!toggleOnGeneration || generation < 20 || !hasVisibleChildren) return
    handleToggleClick(event)
  }
  const isBranchDepthHighlight = branchHighlightFrom != null && generation >= branchHighlightFrom && generation <= branchHighlightTo
  const nodeContent = <><>{toggleOnGeneration && generation >= 20 ? <button className="tree-generation tree-generation-toggle" type="button" onClick={handleGenerationClick}>{generationLabel(generation)}</button> : <span className="tree-generation">{generationLabel(generation)}</span>}</><button className={`tree-person-name ${branchMigration ? 'is-migrated' : ''} ${isBranchDepthHighlight ? 'branch-depth-highlight' : ''}`} type="button" onClick={handleNameClick}>{rawName ? node.title.trim() : formatPersonName(node.title)}{migration && <span className="tree-migration">（{migration}）</span>}</button>{hasVisibleChildren && <sup className="tree-descendant-count">{node.children.length}</sup>}{hasVisibleChildren && <button className={`tree-toggle-button ${isExpanded ? 'is-collapse' : 'is-expand'}`} type="button" aria-label={`${formatPersonName(node.title)}后代`} onClick={handleToggleClick}>{isExpanded ? '-' : '+ 展开'}</button>}</>
  if (!hasVisibleChildren) return <div data-tree-generation={generation} className={`${className} tree-leaf`} style={style}><div className="tree-leaf-row">{nodeContent}</div></div>
  return <details data-tree-generation={generation} open={expandedIds.has(node.id)} className={className} style={style}><summary className={focusedNodeId === node.id ? 'tree-family-summary' : ''} onClick={(event) => event.preventDefault()}>{nodeContent}</summary>{(reverseChildren ? [...node.children].reverse() : node.children).map((child) => <TreeNode key={child.id} node={child} generation={generation + 1} generationLimit={generationLimit} focusedNodeId={focusedNodeId} inheritedMigration={branchMigration} expandedIds={expandedIds} onToggle={onToggle} onFocusNode={onFocusNode} bulkExpandFromGeneration={bulkExpandFromGeneration} branchHighlightFrom={branchHighlightFrom} branchHighlightTo={branchHighlightTo} toggleOnName={toggleOnName} toggleOnGeneration={toggleOnGeneration} reverseChildren={reverseChildren} rawName={rawName} />)}</details>
}

function AnnotationsPage({ go }) { return <PageFrame><Header title="族谱注记" onBack={() => go('tree')} /><div className="page-content annotations-page"><p className="sample-note">共 {annotations.length} 条</p>{annotations.map((note) => <article key={note.id}><b>{note.title}</b></article>)}</div><BottomNav active="annotations" go={go} /></PageFrame> }

export default function App() {
  const [page, setPage] = useState('tree')
  const [selectedId, setSelectedId] = useState(genealogyTree.id)
  const pages = { branches: BranchesPage, node: PersonPage, search: SearchPage, rules: RulesPage, migration: MigrationPage, correction: CorrectionPage, tree: TreePage, annotations: AnnotationsPage }
  const Page = pages[page]
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [page])
  const go = (nextPage, nodeId) => {
    if (nodeId && sourceNodeMap.has(nodeId)) setSelectedId(nodeId)
    setPage(nextPage === 'home' ? 'tree' : nextPage)
  }
  return <Page go={go} selectedId={selectedId} />
}
