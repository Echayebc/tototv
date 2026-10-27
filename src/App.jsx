import { useState, useRef } from 'react'
import Hls from 'hls.js'

const SERVERS = [
  { id: 'es', name: '🇪🇸 TDT España 340', url: 'https://iptv-org.github.io/iptv/countries/es.m3u' },
  { id: 'es-ga', name: '🇪🇸 Galicia', url: 'https://iptv-org.github.io/iptv/subdivisions/es-ga.m3u' },
  { id: 'es-ct', name: '🇪🇸 Catalunya', url: 'https://iptv-org.github.io/iptv/subdivisions/es-ct.m3u' },
  { id: 'es-an', name: '🇪🇸 Andalucía', url: 'https://iptv-org.github.io/iptv/subdivisions/es-an.m3u' },
  { id: 'es-vc', name: '🇪🇸 Valencia', url: 'https://iptv-org.github.io/iptv/subdivisions/es-vc.m3u' },
  { id: 'es-pv', name: '🇪🇸 País Vasco', url: 'https://iptv-org.github.io/iptv/subdivisions/es-pv.m3u' },
  { id: 'fr', name: '🇫🇷 TNT France 180', url: 'https://iptv-org.github.io/iptv/countries/fr.m3u' },
  { id: 'fr-idf', name: '🇫🇷 Paris IDF', url: 'https://iptv-org.github.io/iptv/subdivisions/fr-idf.m3u' },
  { id: 'pt', name: '🇵🇹 TDT Portugal', url: 'https://iptv-org.github.io/iptv/countries/pt.m3u' },
  { id: 'it', name: '🇮🇹 DTT Italia', url: 'https://iptv-org.github.io/iptv/countries/it.m3u' },
  { id: 'de', name: '🇩🇪 TNT Germany', url: 'https://iptv-org.github.io/iptv/countries/de.m3u' },
  { id: 'uk', name: '🇬🇧 Freeview UK', url: 'https://iptv-org.github.io/iptv/countries/uk.m3u' },
  { id: 'be', name: '🇧🇪 TNT Belgique', url: 'https://iptv-org.github.io/iptv/countries/be.m3u' },
  { id: 'ma', name: '🇲🇦 TNT Maroc', url: 'https://iptv-org.github.io/iptv/countries/ma.m3u' },
  { id: 'dz', name: '🇩🇿 TNT Algérie', url: 'https://iptv-org.github.io/iptv/countries/dz.m3u' },
  { id: 'tn', name: '🇹🇳 TNT Tunisie', url: 'https://iptv-org.github.io/iptv/countries/tn.m3u' },
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
  const [activeServer, setActiveServer] = useState('dz')
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
    if (Hls.isSupported() && ch.url.includes('.m3u8') && !useProxy) {
      if (hlsRef.current) hlsRef.current.destroy()
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(ch.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}))
      hls.on(Hls.Events.ERROR, (e,d)=> { if(d.fatal){ setError(`❌ ${ch.name}`) }})
    } else {
      let u = useProxy ? `https://api.allorigins.win/raw?url=${encodeURIComponent(ch.url)}` : ch.url
      video.src = u
      video.play().catch(()=> setError('❌ جرب Proxy'))
    }
  }

  const loadFromUrl = async (server) => {
    setLoading(true)
    setActiveServer(server.id)
    try {
      const res = await fetch(server.url)
      const list = parseM3U(await res.text())
      setChannels(list)
      if (list.length > 0) playChannel(list[0], 0)
    } catch(e){ setError('خطأ تحميل') }
    setLoading(false)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const list = parseM3U(ev.target.result)
      setChannels(list)
      if (list.length > 0) playChannel(list[0], 0)
    }
    reader.readAsText(file)
  }

  const filtered = channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{background:'#000', color:'#fff', minHeight:'100vh'}}>
      <div style={{background:'#000', position:'sticky', top:0, zIndex:10}}>
        <video ref={videoRef} controls playsInline style={{width:'100%', aspectRatio:'16/9', background:'#000'}} />
        {current && <div style={{padding:'22px', textAlign:'center', fontSize:'38px', fontWeight:'900', color:'#ffcc00'}}>📡 {current.name}</div>}
        {error && <div style={{padding:'18px', background:'#cc0000', textAlign:'center', fontSize:'32px', fontWeight:'900'}}>{error}</div>}
      </div>

      <div style={{padding:'16px'}}>
        <button onClick={()=>setUseProxy(!useProxy)} style={{width:'100%', padding:'28px', borderRadius:'16px', border:'none', background: useProxy ? '#00ff88' : '#333', color: useProxy ? '#000' : '#fff', fontSize:'34px', fontWeight:'900', marginBottom:'18px'}}>
          {useProxy ? '✅ Proxy مفعل' : '🔓 تفعيل Proxy'}
        </button>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px'}}>
          {SERVERS.map(s => (
            <button key={s.id} onClick={()=>loadFromUrl(s)} style={{padding:'28px 8px', borderRadius:'16px',
