# FEATURE — JDC Embed Unifié DR1+DR2
## Bot Discord — Donjon Rouge

---

## Contexte

Remplacement des deux embeds séparés (DR1 / DR2) par **un seul embed unifié**
regroupant tous les membres des deux clans dans un seul classement.

Un joueur ne peut faire les JDC que dans un seul clan — donc son score est unique.
La déduplication par tag est INTERDITE : un même tag peut apparaître dans DR1 et DR2
(membres qui ont migré ou qui sont inscrits dans les deux). Chaque entrée de membre
est indépendante.

---

## Baselines — nouvelle contrainte

La table `jdc_baselines` utilise désormais UNIQUEMENT `(player_tag, season)` comme clé unique.
Si un joueur apparaît dans DR1 ET DR2, il n'a qu'une seule baseline (ses points Games Champion
sont les mêmes peu importe le clan).

### Migration SQL — `migrations/jdc_baselines_v2.sql`
```sql
ALTER TABLE jdc_baselines
  DROP CONSTRAINT IF EXISTS jdc_baselines_player_tag_clan_tag_season_key;

ALTER TABLE jdc_baselines
  ADD CONSTRAINT jdc_baselines_player_tag_season_key
  UNIQUE (player_tag, season);

DELETE FROM jdc_baselines a
USING jdc_baselines b
WHERE a.id > b.id
  AND a.player_tag = b.player_tag
  AND a.season = b.season;
```

---

## Script reset baselines juin 2026 — `src/scripts/resetBaselinesFix.js`

Utiliser les valeurs exactes du debug (tags exacts de l'API) :

```js
const KNOWN = [
  // DR1
  { tag: '#YQCULYQ90', known: 10050 },  // CyberAlf
  { tag: '#GPJG9LJCR', known: 5000  },  // Peklenc
  { tag: '#YL2GVUVLC', known: 3350  },  // KD2L
  { tag: '#YPG98U0U9', known: 4050  },  // ★ᴮᴼˢˢ
  { tag: '#99CVVR0QQ', known: 5000  },  // jeremie0411
  { tag: '#88VU8RYR',  known: 10400 },  // Inglo
  { tag: '#2QPP2RQ9J', known: 0     },  // Hibou.KD
  { tag: '#JPJ8L2PG',  known: 6500  },  // SkunK
  { tag: '#LVYRU2LLQ', known: 2100  },  // TarKhon
  { tag: '#YU9CJC08Q', known: 10700 },  // Pogeiwa
  { tag: '#222G00YJP', known: 4600  },  // Hisoka
  { tag: '#LLGY0GY2',  known: 3000  },  // team leduc
  { tag: '#G9CJU9UP0', known: 0     },  // Barbar
  { tag: '#2VR220C8',  known: 10000 },  // Didousse
  { tag: '#YCU2VC9VR', known: 0     },  // LEGENDASTRONO
  { tag: '#G9V9C9088', known: 0     },  // San Andreas
  { tag: '#P22QJVVJY', known: 0     },  // youles (DR1)
  { tag: '#J2222JCU',  known: 5300  },  // OryxBattel
  { tag: '#QGQRPG9LR', known: 0     },  // un mec qui te b
  { tag: '#P9RLU8QGG', known: 10050 },  // le gg
  { tag: '#RGYV02UY',  known: 2450  },  // natou le boss
  { tag: '#808V880CY', known: 4950  },  // toms6o
  { tag: '#YYC2G8R9Q', known: 5100  },  // wArmUp
  { tag: '#CG0RL8QQ',  known: 950   },  // cookie
  { tag: '#20Q9G0RV',  known: 5000  },  // DrayZ
  { tag: '#RVG2G0VQ',  known: 0     },  // Axel
  { tag: '#YUG89VY2C', known: 0     },  // Gotenks
  { tag: '#9YVP0YV',   known: 5800  },  // Cénation
  { tag: '#VUVJVGPY',  known: 300   },  // Starbowtix
  { tag: '#GQPG08YRV', known: 0     },  // Joker
  { tag: '#GV02R22CG', known: 10050 },  // Theman6 (DR1)
  { tag: '#GUYP0CPQC', known: 10250 },  // zaabdel
  { tag: '#2QJG0CLVC', known: 5000  },  // ●Savior● (DR1)
  { tag: '#2UU9CJRL',  known: 0     },  // egane54
  { tag: '#GJV8QG9JL', known: 0     },  // tourtasse
  { tag: '#G9G2L992Y', known: 0     },  // RAPHAËL
  { tag: '#LVLYUC2QG', known: 2150  },  // YOULES2RUSH
  { tag: '#YUQ9UUYV9', known: 5100  },  // 404_mike
  { tag: '#2J2Q8R2R9', known: 0     },  // Inglo_D (DR1)
  { tag: '#GJP29P8JG', known: 0     },  // KD2L 3rd
  { tag: '#QJJQGC2QC', known: 300   },  // VORTEX (DR1)
  { tag: '#QPPUVJQGL', known: 5450  },  // RoтaтoЯ™ (DR1)
  // DR2 — membres pas déjà dans DR1
  { tag: '#YCU8QROXL', known: 800   },  // ꧁ORYX꧂
  { tag: '#2CP089GL0', known: 10000 },  // Dina_Malefika
  { tag: '#GV02R22CG', known: 10050 },  // Theman6 (DR2 — même tag que DR1, baseline identique)
  { tag: '#QPPUVJQGL', known: 5450  },  // RoтaтoЯ™ (DR2 — même tag)
  { tag: '#P22QJVVJY', known: 5000  },  // youles (DR2 — même tag, points DR2)
  { tag: '#2J2Q8R2R9', known: 6500  },  // Inglo_D (DR2)
  { tag: '#QJJQGC2QC', known: 5450  },  // VORTEX (DR2)
  { tag: '#2QJG0CLVC', known: 5000  },  // ●Savior● (DR2)
  { tag: '#R8QCP2VUU', known: 125775},  // Ayreon — 0 pts connus
  { tag: '#GG9YPJ999', known: 10100 },  // Jiraqix
  { tag: '#9YJVV2GLP', known: 3200  },  // carla
  { tag: '#YU9LVPQ2R', known: 5050  },  // DrayZ-2
  { tag: '#GJUP29YLP', known: 400   },  // KD2L 2nd
  { tag: '#2RCPJVULP', known: 2100  },  // Judo Range
]
// Pour chaque entrée : baseline = current_Games_Champion - known
// upsert sur (player_tag, season) — les doublons (même tag DR1+DR2) 
// seront écrasés par le dernier upsert, ce qui est correct car
// Games Champion est par joueur, pas par clan
```

**Important :** Pour les membres présents dans les deux clans (même tag), 
le script doit prendre le **max** des points connus entre DR1 et DR2 :
- youles : DR1=0, DR2=5000 → known=5000
- Theman6 : DR1=10050, DR2=10050 → known=10050
- RotatoR™ : DR1=5450, DR2=5450 → known=5450
- VORTEX : DR1=300, DR2=5450 → known=5450
- Inglo_D : DR1=0, DR2=6500 → known=6500
- •Savior• : DR1=5000, DR2=5000 → known=5000

---

## Fetch membres — liste complète sans déduplication

```js
async function fetchAllMembersWithPoints(season) {
  // 1. Récupérer membres DR1 + DR2 séparément
  const [raw1, raw2] = await Promise.all([getClanMembers(), getClanMembersDR2()])
  const members1 = raw1?.items ?? (Array.isArray(raw1) ? raw1 : [])
  const members2 = raw2?.items ?? (Array.isArray(raw2) ? raw2 : [])

  // 2. Union complète SANS déduplication — chaque membre de chaque clan
  // Un même joueur (même tag) dans DR1 et DR2 sera traité une seule fois
  // car Games Champion est par joueur, pas par clan
  const tagsSeen = new Set()
  const allMembers = []
  for (const m of [...members1, ...members2]) {
    if (!tagsSeen.has(m.tag)) {
      tagsSeen.add(m.tag)
      allMembers.push(m)
    }
  }

  // 3. Charger les baselines par (player_tag, season)
  const { data: baselines } = await supabase
    .from('jdc_baselines')
    .select('player_tag, baseline_value')
    .eq('season', season)
    .in('player_tag', allMembers.map(m => m.tag))

  const baselineMap = Object.fromEntries(
    (baselines || []).map(b => [b.player_tag, b.baseline_value])
  )

  // 4. Calculer le delta pour chaque membre
  const results = []
  for (const m of allMembers) {
    try {
      const player  = await getPlayer(m.tag)
      const current = extractClanGamePoints(player)
      const base    = baselineMap[m.tag] ?? current
      results.push({ tag: m.tag, name: m.name, points: Math.max(0, current - base) })
    } catch {
      results.push({ tag: m.tag, name: m.name, points: 0 })
    }
    await sleep(150)
  }

  return results.sort((a, b) => b.points - a.points)
}
```

---

## Embed unifié

### Clé bot_config
- Supprimer `jdc_embed_dr1_id` et `jdc_embed_dr2_id`
- Nouvelle clé : `jdc_embed_all_id`

### Format embed
```
⚔️ JEUX DE CLAN — DONJON ROUGE
📅 Du 22/06 au 28/06 • Mise à jour : il y a 2 min

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESSION GLOBALE (DR1 + DR2)
Points : 221 150 / 50 000 pts
Palier atteint : ✅ Tier VI (MAX)
[████████████████████] 100%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSEMENT MEMBRES            PTS    STATUT
 1. Pogeiwa                 10700   ✅
 2. Jiraqix                 10100   ✅
 3. zaabdel                 10250   ✅
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total : 221 150 pts • Membres : 52
Membres ≥ 5 000 pts (règlement DR) : 22/52
Membres ≥ 4 000 pts (bonus) : 26/52
```

### Bouton Actualiser
Conserver `custom_id: jdc_refresh`

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/lib/jdcTracker.js` | Remplacer les deux embeds par `fetchAllMembersWithPoints`, clé `jdc_embed_all_id`, adapter `buildJdcEmbed`, `saveBaselines`, `handleJdcRefresh` |
| `src/lib/messagingHandlers.js` | Adapter `fetchJdcMembersUnder5000` |
| `src/lib/panelHandlers.js` | Adapter `handleAdminRefreshJdc` |
| `migrations/jdc_baselines_v2.sql` | Nouvelle contrainte unique |
| `src/scripts/resetBaselinesFix.js` | Script one-shot correction baselines juin 2026 |

---

## Notes importantes

1. **Tags exacts** — utiliser uniquement les tags de l'API, jamais les noms
2. **Membres en double** — si un membre est dans DR1 ET DR2, il n'apparaît qu'une fois dans le classement (déduplication par tag via Set)
3. **Baselines membres en double** — prendre le MAX des points connus entre les deux clans
4. **Ayreon** — 0 pts connus, baseline = valeur actuelle Games Champion
5. **Pour juillet 2026** — `startJdcTracking` fonctionnera parfaitement dès le début sans intervention manuelle
