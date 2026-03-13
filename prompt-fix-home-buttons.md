# 🏰 Prompt Claude Code — Donjon Rouge
## Fix : boutons Accueil → bons onglets Guilde

---

## FICHIER — `frontend/src/pages/Home.jsx`

### Bouton Inscriptions GDC/LDC → onglet `inscriptions`

Remplace :
```jsx
<Link
  to="/guilde"
  state={{ openTab: 'gdcldc' }}
  className="px-6 py-3 font-cinzel uppercase tracking-wider font-bold text-bone rounded border border-gold/50 hover:border-gold transition-all hover:scale-105"
  style={{ background: 'rgba(180,130,0,0.15)' }}
>
  ⚔️ Inscriptions GDC/LDC
</Link>
```

Par :
```jsx
<Link
  to="/guilde"
  state={{ openTab: 'inscriptions' }}
  className="px-6 py-3 font-cinzel uppercase tracking-wider font-bold text-bone rounded border border-gold/50 hover:border-gold transition-all hover:scale-105"
  style={{ background: 'rgba(180,130,0,0.15)' }}
>
  ⚔️ Inscriptions GDC/LDC
</Link>
```

### Bouton Prochaine Guerre → Voir → onglet `gdcldc`

Remplace :
```jsx
<Link
  to="/tracker"
  className="ml-auto text-crimson text-sm font-cinzel uppercase hover:text-ember transition-colors"
>
  Voir →
</Link>
```

Par :
```jsx
<Link
  to="/guilde"
  state={{ openTab: 'gdcldc' }}
  className="ml-auto text-crimson text-sm font-cinzel uppercase hover:text-ember transition-colors"
>
  Voir →
</Link>
```

---

## DÉPLOIEMENT

```bash
git add .
git commit -m "fix: boutons accueil → inscriptions et GDC/LDC dans Guilde"
git push origin main
```

---

*Donjon Rouge — Clan #29292QPRC*
