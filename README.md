# Nimbus Hop

Un petit mouton saute de nuage en nuage. Les nuages dérivent de gauche à droite, à des vitesses différentes : un tap = un saut, à chronométrer pour atterrir sur un nuage. Jouable dans le navigateur, au doigt, à la souris et au clavier.

A tiny sheep hops from cloud to cloud. Clouds drift left to right at different speeds: one tap, one jump, time it to land. Playable in the browser and on mobile.

- Jouer / Play : https://nimbus-hop.opengamingstudio.com
- Licence : [MIT](LICENSE)
- Projet de [OpenGamingStudio](https://github.com/OpenGamingStudio), studio de jeux web open source.

## Le jeu / The game

| | |
|---|---|
| Contrôles | tap ou clic sur le plateau, `Espace`, `↑` ou `W` pour sauter ; `Échap` ou `P` pour la pause (automatique si l'onglet est caché) |
| Score | 1 point par nuage franchi ; atterrir au centre du nuage (« Parfait ! ») enchaîne un combo : +1 point de plus par parfait d'affilée (jusqu'à +5) |
| Difficulté | à chaque rangée, les nuages vont plus vite, rétrécissent et s'espacent |
| Fin | si aucun nuage n'est sous le mouton à l'atterrissage, il tombe ; un tap relance une partie |
| Réglages | pause, son coupable (accueil et en jeu), `prefers-reduced-motion` respecté (pas de secousse ni de particules) |
| Sauvegarde | `localStorage` (`nimbushop.save`) : record et son, validés à la lecture ; le jeu marche aussi sans stockage |

Les règles sont dans [`src/sim.ts`](src/sim.ts) (sans DOM, testées), le dessin dans `src/render.ts`.

## Développement / Development

Node ≥ 20.

```sh
npm ci
npm run dev       # serveur de développement
npm test          # tests (vitest)
npm run build     # tsc + build statique dans dist/
```

Le `Dockerfile` construit le site et le sert avec nginx (en-têtes de sécurité, CSP stricte, aucune ressource externe).
