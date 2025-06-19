# Changelog

Todas las actualizaciones importantes del proyecto ClassCraft se documentan aquí.

## [1.1.0] - 2024-12-18

### ✨ Nuevo
- Sistema de alertas CSS con animaciones slideIn/slideOut implementado
- Función `showAlert(message, type)` para notificaciones dinámicas
- 4 tipos de alertas: success, error, info, warning con colores temáticos
- Auto-eliminación de alertas después de 4 segundos

### 🎨 UI/UX
- Posicionamiento fixed top-right para alertas (esquina superior derecha)
- Animaciones CSS suaves de entrada/salida (0.4s duration)
- Design responsive para móviles (full-width en pantallas pequeñas)
- Colores épicos estilo taberna medieval para cada tipo de alerta
- Z-index 9999 para correcta superposición sobre contenido

### 🔧 Técnico
- Contenedor dinámico `.alert-container` creado automáticamente
- Gestión inteligente del DOM (crear/limpiar automáticamente)
- Keyframes CSS: `slideInAlert` y `slideOutAlert`
- Sistema de fade-out con clase `.fade-out` aplicada dinámicamente
- API unificada en `app.js` para mostrar notificaciones

### 🚧 Pendiente
- **PROBLEMA IDENTIFICADO**: Alertas hardcodeadas en HTML aún presentes
- Necesario reemplazar alertas estáticas en: `unirse-clase.html`, `crear-personaje.html`, `gestionar-clase.html`
- Migrar de `<div class="alert alert-info">` a llamadas `showAlert()`

---

## [1.0.0] - 2024-12-XX

### ✨ Funcionalidades Iniciales
- Sistema RPG completo con personajes, clases y razas
- Autenticación JWT con roles (estudiante/profesor/admin)
- Sistema de habilidades con cooldowns
- Gestión de equipos (máximo 4 miembros)
- Panel profesor para gestionar estudiantes
- Sistema de inventario y monedas
- Base de datos MongoDB con 18 colecciones
- Setup automático con datos de prueba
- Interfaz temática estilo taberna medieval
