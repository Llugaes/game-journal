type View = 'shelf' | 'notes' | 'about' | 'detail'

export function JournalHeader({ view, onChange }: { view: View; onChange: (view: 'shelf' | 'notes' | 'about') => void }) {
  const items: Array<{ id: 'shelf' | 'notes' | 'about'; label: string }> = [{ id: 'shelf', label: '游戏架' }, { id: 'notes', label: '随笔' }, { id: 'about', label: '关于' }]
  return <header className="site-header"><a className="wordmark" href="#top" onClick={() => onChange('shelf')}>游记</a><nav aria-label="主导航">{items.map(item => <button key={item.id} className={view === item.id || (view === 'detail' && item.id === 'shelf') ? 'active' : ''} onClick={() => onChange(item.id)}>{item.label}</button>)}</nav></header>
}
