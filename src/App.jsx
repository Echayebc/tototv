import { useState, useRef } from 'react'
import Hls from 'hls.js'

// كل السيرفرات الشبيهة بـ TDT و TNT
const SERVERS = [
  // إسبانيا TDT - الأساس
  { id: 'es', name: '🇪🇸 TDT España 340', url: 'https://iptv-org.github.io/iptv/countries/es.m3u' },
  { id: 'es-ga', name: '🇪🇸 Galicia', url: 'https://iptv-org.github.io/iptv/subdivisions/es-ga.m3u' },
  { id: 'es-ct', name: '🇪🇸 Catalunya', url: 'https://iptv-org.github.io/iptv/subdivisions/es-ct.m3u' },
  { id: 'es-an', name: '🇪🇸 Andalucía', url: 'https://iptv-org.github.io/iptv/subdivisions/es-an.m3u' },
  { id: 'es-vc', name: '🇪🇸 Valencia', url: 'https://iptv-org.github.io/iptv/subdivisions/es-vc.m3u' },
  { id: 'es-pv', name: '🇪🇸 País Vasco', url: 'https://iptv-org.github.io/iptv/subdivisions/es-pv.m3u' },

  // TNT فرنسا - شبيه TDT
  { id: 'fr', name: '🇫🇷 TNT France 180', url: 'https://iptv-org.github.io/iptv/countries/fr.m3u' },
  { id: 'fr-idf', name: '🇫🇷 Paris IDF', url: 'https://iptv-org.github.io/iptv/subdivisions/fr-idf.m3u' },

  // شبيه TDT في دول أخرى
  { id: 'pt', name: '🇵🇹 TDT Portugal', url: 'https://iptv-org.github.io/iptv/countries/pt.m3u' },
  { id: 'it', name: '🇮🇹 DTT Italia', url: 'https://iptv-org.github.io/iptv/countries/it.m3u' },
  { id: 'de', name: '🇩🇪 TNT Germany', url: 'https://iptv-org.github.io/iptv/countries/de.m3u' },
  { id: 'uk', name: '🇬🇧 Freeview UK', url: 'https://iptv-org.github.io/iptv/countries/uk.m3u' },
  { id: 'be', name: '🇧🇪 TNT Belgique', url: 'https://iptv-org.github.io/iptv/countries/be.m3u' },
  { id: 'ma', name: '🇲🇦 TNT Maroc', url: 'https://iptv-org.github.io/iptv/countries/ma.m3u' },
  { id: 'dz', name: '🇩🇿 TNT Algérie', url: 'https://iptv-org.github.io/iptv/countries/dz.m3u' },
  { id: 'tn', name: '🇹🇳 TNT Tunisie', url: 'https://iptv-org.github.io/iptv/countries/tn.m3u' },

  // تصنيفات شبيهة TDT
  { id: 'general', name: '📺 Generalista', url: 'https://iptv-org.github.io/iptv/categories/general.m3u' },
  { id: 'ent', name: '🎬 Entretenimiento', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
  { id: 'news', name: '📰 Noticias TDT', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
  { id: 'sports', name: '⚽ Deportes', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
]

export default function App() {
  const [channels, setChannels] = useState([])
  const [current, setCurrent] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeServer, setActiveServer] = useState(null)
  const [error, setError] = useState('')
  const [useProxy, setUseProxy] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  const parseM3U = (text) => {
    const lines = text.split('\n')
    const list = []
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF')) {
        const name = lines[i].split(',').pop()?.trim() || `قناة ${list.length+1}`
        let url = lines[i+1]?.trim()
        if (url && url.startsWith('http')) list.push({ name, url })
      }
    }
    return list
  }

  const playChannel = (ch, index) => {
    setCurrent({ ...ch, index })
    setError('')
    const video = videoRef.current
    if (!video) return
    let playUrl = ch.url
    if (useProxy) playUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(ch.url)}`
    if (Hls.isSupported() && ch.url.includes('.m3u8') && !useProxy) {
      if (hlsRef.current) hlsRef.current.destroy()
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(ch.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}))
      hls.on(Hls.Events.ERROR, (e,d)=> { if(d.fatal){ setError(`❌ ${ch.name}`); const n=channels[index+1]; if(n) setTimeout(()=>playChannel(n,index+1),1000) }})
    } else {
      video.src = useProxy ? playUrl : ch.url
      video.play().catch(()=> setError('❌ جرب Proxy'))
    }
  }

  const loadFromUrl = async (server) => {
    setLoading(true)
    setActiveServer(server.id)
    setError('')
    try {
      const res = await fetch(server.url)
      const list = parseM3U(await res.text())
      setChannels(list)
      if (list.length > 0) playChannel(list[0], 0)
    } catch(e){ setError('خطأ') }
    setLoading(false)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const list = parseM3U(ev.target.result)
      setChannels(list)
      setActiveServer('file')
      if (list.length > 0) playChannel(list[0], 0)
    }
    reader.readAsText(file)
  }

  const filtered = channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{background:'#000', color:'#fff', minHeight:'100vh', fontFamily:'system-ui'}}>
      <div style={{background:'#000', position:'sticky', top:0, zIndex:10}}>
        <video ref={videoRef} controls playsInline style={{width:'100%', height:'auto', maxHeight:'58vh', aspectRatio:'16/9', background:'#000', display:'block', objectFit:'fill'}} />
        {current && <div style={{padding:'16px', textAlign:'center', fontSize:'28px', fontWeight:'900', color:'#ffcc00', background:'#0a0a0a'}}>📡 {current.name}</div>}
        {error && <div style={{padding:'12px', background:'#cc0000', textAlign:'center', fontSize:'22px', fontWeight:'800'}}>{error}</div>}
      </div>

      <div style={{padding:'14px', background:'#0a0a0a'}}>
        <button onClick={()=>setUseProxy(!useProxy)} style={{width:'100%', padding:'20px', borderRadius:'14px', border:'none', background: useProxy ? '#00ff88' : '#222', color: useProxy ? '#000' : '#fff', fontSize:'24px', fontWeight:'900', marginBottom:'12px'}}>
          {useProxy ? '✅ Proxy مفعل' : '🔓 تفعيل Proxy للقنوات المحجوبة'}
        </button>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'14px'}}>
          {SERVERS.map(s => (
            <button key={s.id} onClick={()=>loadFromUrl(s)} style={{padding:'18px 6px', borderRadius:'12px', border:'none', background: activeServer===s.id ? '#ffcc00' : '#1a1a1a', color: activeServer===s.id ? '#000' : '#fff', fontWeight:'900', fontSize:'16px', lineHeight:'1.2'}}>
              {s.name}
            </button>
          ))}
        </div>

        <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
          <input value={customUrl} onChange={e=>setCustomUrl(e.target.value)} placeholder="رابط M3U..." style={{flex:1, padding:'18px', borderRadius:'12px', border:'none', background:'#1a1a1a', color:'#fff', fontSize:'20px'}} />
          <button onClick={()=>{ if(customUrl.trim()) loadFromUrl({id:'custom', url:customUrl.trim()}) }} style={{padding:'18px 22px', borderRadius:'12px', border:'none', background:'#ffcc00', color:'#000', fontWeight:'900', fontSize:'20px'}}>شغل</button>
        </div>

        <label style={{display:'block', background:'#222', padding:'18px', borderRadius:'12px', textAlign:'center', marginBottom:'14px', fontSize:'22px', fontWeight:'800'}}>
          📂 رفع ملف M3U
          <input type="file" accept=".m3u,.m3u8,.txt" onChange={handleFile} style={{display:'none'}} />
        </label>

        {loading && <div style={{textAlign:'center', color:'#ffcc00', fontSize:'28px', padding:'16px', fontWeight:'900'}}>⏳ يحمل...</div>}

        {channels.length > 0 && (
          <>
            <input placeholder="🔍 ابحث..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%', padding:'18px', borderRadius:'12px', border:'none', background:'#1a1a1a', color:'#fff', marginBottom:'12px', fontSize:'22px', boxSizing:'border-box'}} />
            <div style={{display:'grid', gap:'10px'}}>
              {filtered.slice(0,600).map((ch, i) => (
                <div key={i} onClick={()=>playChannel(ch, i)} style={{padding:'20px', background: current?.url===ch.url ? '#ffcc00' : '#141414', color: current?.url===ch.url ? '#000' : '#fff', borderRadius:'12px', fontSize:'24px', fontWeight:'800'}}>
                  ▶️ {ch.name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
