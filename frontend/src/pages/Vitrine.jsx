import SectionHeader from '../components/SectionHeader.jsx'

const PATCH_NOTES = [
  {
    type: 'MISE À JOUR',
    title: 'Clash of Clans — Mise à jour de printemps 2025',
    date: 'Mars 2025',
    desc: 'Nouveaux équipements héros, ajustements de l\'HDV16, nouvelles troupes.',
    url: '#'
  },
  {
    type: 'ÉQUILIBRAGE',
    title: 'Patch d\'équilibrage — Février 2025',
    date: 'Février 2025',
    desc: 'Rééquilibrage des défenses de l\'HDV15 et des sorts.',
    url: '#'
  },
  {
    type: 'ÉVÉNEMENT',
    title: 'Événement Raid Weekend — Bonus x2',
    date: 'Janvier 2025',
    desc: 'Ressources du Capital doublées pendant le weekend.',
    url: '#'
  }
]

const INFLUENCEURS = [
  {
    name: 'Clash with Ash',
    desc: 'Stratégies d\'attaque HDV15/16, guides base',
    url: 'https://www.youtube.com/@ClashWithAsh',
    thumb: 'https://raw.githubusercontent.com/Statscell/clash-assets/main/troops/Dragon.png'
  },
  {
    name: 'Judo Sloth Gaming',
    desc: 'Bases défensives et CWL',
    url: 'https://www.youtube.com/@JudoSlothGaming',
    thumb: 'https://raw.githubusercontent.com/Statscell/clash-assets/main/troops/Golem.png'
  },
  {
    name: 'CarbonFins',
    desc: 'Analyses et tier lists',
    url: 'https://www.youtube.com/@CarbonFins',
    thumb: 'https://raw.githubusercontent.com/Statscell/clash-assets/main/troops/Electro_Dragon.png'
  }
]

const TYPE_COLORS = {
  'MISE À JOUR': 'text-gold-light border-gold',
  'ÉQUILIBRAGE': 'text-blue-400 border-blue-500',
  'ÉVÉNEMENT': 'text-green-400 border-green-500'
}

export default function Vitrine() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-up">
      <SectionHeader title="Vitrine" subtitle="Actualités & Ressources CoC" />

      {/* Patch Notes */}
      <section className="mb-14">
        <h2 className="font-cinzel text-xl uppercase tracking-widest text-gold mb-6 flex items-center gap-3">
          <span>Patch Notes</span>
          <div className="flex-1 h-px bg-fog" />
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PATCH_NOTES.map((p) => (
            <div key={p.title} className="card-stone p-5 flex flex-col gap-3">
              <span className={`text-xs font-cinzel uppercase font-bold border px-2 py-0.5 rounded self-start ${TYPE_COLORS[p.type] || 'text-ash border-fog'}`}>
                {p.type}
              </span>
              <h3 className="font-semibold text-bone text-sm leading-snug">{p.title}</h3>
              <p className="text-ash text-xs flex-1">{p.desc}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-fog font-cinzel">{p.date}</span>
                <a href={p.url} className="text-xs text-crimson hover:text-ember font-cinzel uppercase transition-colors">
                  Lire →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Influenceurs */}
      <section>
        <h2 className="font-cinzel text-xl uppercase tracking-widest text-gold mb-6 flex items-center gap-3">
          <span>Créateurs de contenu</span>
          <div className="flex-1 h-px bg-fog" />
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {INFLUENCEURS.map((v) => (
            <a
              key={v.name}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-stone p-5 flex gap-4 items-center hover:border-crimson transition-all group"
            >
              <img
                src={v.thumb}
                alt={v.name}
                className="w-14 h-14 object-contain rounded"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div>
                <p className="font-semibold text-bone group-hover:text-gold-light transition-colors font-cinzel text-sm">
                  {v.name}
                </p>
                <p className="text-xs text-ash mt-1">{v.desc}</p>
                <span className="text-xs text-crimson mt-2 block font-cinzel uppercase">YouTube →</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
