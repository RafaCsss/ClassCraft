# ClassCraft - Sistema RPG Educativo

Sistema de gamificación para aulas basado en mecánicas RPG. Los estudiantes crean personajes con clases y razas, usan habilidades, forman equipos y ganan experiencia completando tareas.

## Instalación

```bash
git clone [repo]
cd ClassCraft
npm install
node app.js
```

Abrir: http://localhost:3000

## Funcionalidades

### Personajes RPG
- 3 clases: Mago, Guerrero, Curandero
- 3 razas: Humano, Elfo, Enano
- Sistema de stats: salud, energía, nivel, XP
- Avatar personalizable

### Habilidades
- Habilidades generales para todos
- Habilidades específicas por clase
- Sistema de cooldowns
- Efectos temporales (buffs/debuffs)

### Equipos
- Máximo 4 estudiantes por equipo
- Puntos grupales compartidos
- Personalización con colores/emblemas

### Sistema de Clases
- Códigos únicos para unirse
- Panel profesor para gestionar estudiantes
- Modificar stats en tiempo real
- Misiones y recompensas

### Inventario
- Sistema de monedas
- Items con diferentes rareza
- Efectos temporales

## Credenciales de Prueba

**Profesor:**
- Email: profesor@test.com  
- Password: 123456

**Estudiantes:**
- ana@test.com / 123456
- carlos@test.com / 123456
- maria@test.com / 123456
- pedro@test.com / 123456

Código de clase: `MATE5A`

## API Endpoints

### Autenticación
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

### Personajes
```
POST /api/personajes/crear
GET  /api/personajes/mi-personaje
POST /api/personajes/usar-habilidad
```

### Clases
```
POST /api/clases/crear
GET  /api/clases/mis-clases
POST /api/clases/unirse/:codigo
PUT  /api/clases/:id/estudiante/:userId/stats
```

### Equipos
```
POST /api/equipos/crear
GET  /api/equipos/
POST /api/equipos/:id/unirse
```

## Base de Datos

MongoDB con 18 colecciones:
- usuarios, personajes, clases_personaje, razas
- habilidades, inventarios, items, equipos
- clases, misiones, progreso_misiones, titulos
- notificaciones, clases_activas, efectos_activos
- historial_acciones, cooldowns_habilidades, animaciones_activas

## Estructura

```
/
├── app.js              # Servidor principal
├── package.json        # Dependencias
├── middleware/         # Auth JWT
├── models/             # Modelos Mongoose (18)
├── routes/             # Endpoints API
└── public/             # Frontend HTML/CSS/JS
```

## Stack Tecnológico

- Backend: Node.js + Express
- Base de datos: MongoDB + Mongoose
- Frontend: HTML + CSS + JavaScript
- Autenticación: JWT + bcrypt

## Troubleshooting

**Error "argument handler must be a function":**
```js
// Incorrecto
const auth = require('../middleware/auth');
// Correcto  
const { verificarToken } = require('../middleware/auth');
```

**Error validación equipos:**
Verificar que la validación esté en el array completo, no en elementos individuales.

**CastError ObjectId:**
Verificar consistencia entre nombres de propiedades frontend/backend.

**Endpoints verbose con debugging:**
Algunos endpoints como `/api/clases/:id/estudiante/:estudianteId/stats` tienen console.logs extensivos para debugging. Funciona correctamente pero podría optimizarse. El archivo `fix-accion-endpoint.js` contiene una versión más limpia que unifica XP + stats en un solo endpoint `/accion`, pero se mantiene la implementación actual por estabilidad.

## Scripts de Migración

### Archivos disponibles en /scripts/

**migrar-equipos-a-clases.js** - Migración Básica
- Estrategia: Asigna primera clase activa del profesor a cada equipo
- Uso: Migración simple y rápida
- Seguro: No modifica equipos que ya tienen clase_id

**migrar-equipos-inteligente.js** - Migración Inteligente (Recomendado)
- Estrategia: Analiza miembros del equipo para encontrar la clase correcta
- Ventajas: Mayor precisión en la asignación
- Incluye: Función de rollback para deshacer cambios

### Uso de Scripts

```bash
# Ejecutar Migración Inteligente (Recomendado)
node scripts/migrar-equipos-inteligente.js

# Ejecutar Migración Básica
node scripts/migrar-equipos-a-clases.js

# Rollback (Deshacer Migración)
node scripts/migrar-equipos-inteligente.js rollback
```

### Qué hace la Migración Inteligente

1. **Análisis por Miembros:**
   - Busca clases donde están los miembros del equipo
   - Asigna la clase con más miembros coincidentes

2. **Fallback por Profesor:**
   - Si no encuentra por miembros, usa primera clase del profesor
   - Si profesor no tiene clases, deja como global

3. **Estadísticas Completas:**
   - Muestra antes/después de la migración
   - Detalle de cada equipo procesado

### Seguridad de Scripts

- No destructivo: Solo modifica equipos sin clase_id
- Rollback disponible: Puede deshacer todos los cambios
- Logs detallados: Seguimiento completo del proceso
- Validaciones: Verifica integridad antes de modificar

## TODO

- [ ] Animaciones WebSocket en tiempo real
- [ ] Sistema de notificaciones push
- [ ] Marketplace de items
- [ ] Optimizaciones de performance

---

Sistema completo funcional para convertir cualquier aula en una experiencia RPG gamificada.
