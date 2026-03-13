import SectionHeader from '../components/SectionHeader.jsx'

const PATCH_NOTES = [
  {
    type: 'MISE À JOUR',
    title: 'Mise à jour Février 2026 — Le Duc Draconique',
    date: 'Février 2026',
    desc: 'Nouveau héros le Duc Draconique, nouveau familier le Corbutin, refonte complète du Pass Or, améliorations HDV18, tour sismique et défenses assemblées.',
    url: 'https://clashofclans.fr/sneak-peek/sneak-peek-mise-a-jour-de-fevrier-jour-1/'
  },
  {
    type: 'ÉQUILIBRAGE',
    title: 'Le Sacre de l\'Offensive — Équilibrage 2026',
    date: '16 Février 2026',
    desc: 'Nerfs massifs des défenses (Canon Ricochet, Tour d\'Archères Multiple, Tour Vengeuse) et buffs offensifs pour relancer la méta attaque.',
    url: 'https://clashofclans.fr/sneak-peek/mise-a-jour-dequilibrage-le-sacre-de-loffensive/'
  },
  {
    type: 'MISE À JOUR',
    title: 'Hôtel de Ville 18 — Novembre 2025',
    date: 'Novembre 2025',
    desc: 'Deux gardiens intégrés à l\'HDV, fusion de défense, nouveaux niveaux troupes et bâtiments. Le plus grand ajout depuis des années.',
    url: 'https://clashofclans.fr/sneak-peek/mise-a-jour-hotel-de-ville-18/'
  },
  {
    type: 'ÉVÉNEMENT',
    title: 'Sneak Peek #3 — Nouveau héros emprisonné',
    date: '22 Février 2026',
    desc: 'Découvrez les dernières révélations sur la mise à jour de février et le nouveau héros mystère qui se prépare à rejoindre le combat.',
    url: 'https://clashofclans.fr/category/sneak-peek/'
  },
]

const CREATEURS = [
  {
    name: 'Skarex',
    desc: 'Commentateur eSport CoC FR, stratégies d\'attaque HDV17, mode classé et meta ligue légende. Code créateur : SKAREX',
    url: 'https://www.youtube.com/channel/UC0QsbIdsn75NES7JrNqQ7vw',
    platform: 'YouTube',
    flag: '🇫🇷🇨🇭',
  },
  {
    name: 'Elchiki - Clash Of Clans',
    desc: 'Gameplay CoC depuis 2014, challenges, astuces et événements communautaires. 330K abonnés, créateur officiel Supercell. Code : ELCHIKI',
    url: 'https://www.youtube.com/@elchikicoc',
    platform: 'YouTube',
    flag: '🇫🇷',
  },
  {
    name: 'lawoke27',
    desc: 'Créateur officiel Clash of Clans, stratégies d\'attaque, super troupes et guides pour tous les HDV. Code : LAWOKE27',
    url: 'https://www.youtube.com/@Lawoke',
    platform: 'YouTube',
    flag: '🇫🇷',
  },
]

const RESSOURCES = [
  {
    name: 'Clash of Clans FR',
    desc: 'Le site de référence francophone pour toute l\'actualité CoC : sneak peeks, guides et mises à jour.',
    url: 'https://clashofclans.fr',
  },
  {
    name: 'Sneak Peeks & Events',
    desc: 'Tous les sneak peeks et événements CoC en français, en avant-première.',
    url: 'https://clashofclans.fr/category/sneak-peek/evenements/',
  },
]

const TYPE_COLORS = {
  'MISE À JOUR': 'text-gold-light border-gold',
  'ÉQUILIBRAGE': 'text-blue-400 border-blue-500',
  'ÉVÉNEMENT':   'text-green-400 border-green-500',
}

export default function Vitrine() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-up">
      <SectionHeader title="Vitrine" subtitle="Actualités & Ressources CoC" />

      {/* Patch Notes */}
      <section className="mb-14">
        <h2 className="font-cinzel text-xl uppercase tracking-widest text-gold mb-6 flex items-center gap-3">
          <span>📋 Actualités</span>
          <div className="flex-1 h-px bg-fog" />
          <a
            href="https://clashofclans.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ash hover:text-crimson font-cinzel uppercase tracking-wider transition-colors"
          >
            Voir tout →
          </a>
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {PATCH_NOTES.map((p) => (
            <div key={p.title} className="card-stone p-5 flex flex-col gap-3">
              <span className={`text-xs font-cinzel uppercase font-bold border px-2 py-0.5 rounded self-start ${TYPE_COLORS[p.type] || 'text-ash border-fog'}`}>
                {p.type}
              </span>
              <h3 className="font-semibold text-bone text-sm leading-snug">{p.title}</h3>
              <p className="text-ash text-xs flex-1">{p.desc}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-fog font-cinzel">{p.date}</span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-crimson hover:text-ember font-cinzel uppercase transition-colors"
                >
                  Lire →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Créateurs de contenu */}
      <section className="mb-14">
        <h2 className="font-cinzel text-xl uppercase tracking-widest text-gold mb-6 flex items-center gap-3">
          <span>🎥 Créateurs de contenu</span>
          <div className="flex-1 h-px bg-fog" />
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {CREATEURS.map((v) => (
            <a
              key={v.name}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-stone p-5 flex flex-col gap-3 hover:border-crimson/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 border border-crimson/30"
                  style={{ background: 'linear-gradient(135deg, #1a0000, #3a0000)' }}
                >
                  {v.flag}
                </div>
                <div>
                  <p className="font-semibold text-bone group-hover:text-gold-light transition-colors font-cinzel text-sm">
                    {v.name}
                  </p>
                  <span className="text-xs text-crimson font-cinzel uppercase">{v.platform} →</span>
                </div>
              </div>
              <p className="text-xs text-ash leading-relaxed">{v.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Ressources */}
      <section>
        <h2 className="font-cinzel text-xl uppercase tracking-widest text-gold mb-6 flex items-center gap-3">
          <span>🔗 Ressources utiles</span>
          <div className="flex-1 h-px bg-fog" />
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {RESSOURCES.map((r) => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-stone p-5 flex items-center gap-4 hover:border-crimson/50 transition-all group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1a0000, #3a0000)' }}
              >
                🏰
              </div>
              <div>
                <p className="font-semibold text-bone group-hover:text-gold-light transition-colors font-cinzel text-sm">
                  {r.name}
                </p>
                <p className="text-xs text-ash mt-1">{r.desc}</p>
                <span className="text-xs text-crimson mt-1 block font-cinzel uppercase">Visiter →</span>
              </div>
            </a>
          ))}
        </div>
      </section>

    </div>
  )
}
