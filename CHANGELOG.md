# Changelog

Todas las actualizaciones importantes del proyecto ClassCraft se documentan aquí.

## [0.9.0] - 2024-12-20

### ✨ Nuevo
- Sistema de equipos completamente rediseñado y funcional
- Vista visual mejorada para equipos con cards estilo medieval
- Nuevo logo CLASSCRAFT implementado en header
- Fondo temático agregado a toda la aplicación
- Selección visual de clases y razas con imágenes clickeables
- Interfaz de creación de personaje completamente renovada

### 🎨 UI/UX
- Header optimizado con logo centrado a 350px
- Eliminación de padding innecesario en header para diseño compacto
- Background medieval aplicado globalmente
- Cards de equipos con diseño cohesivo y responsivo
- Selección de clase/raza ahora con preview visual en tiempo real
- Transiciones suaves en selección de opciones

### 🔧 Técnico
- Funcionalidad de equipos debuggeada y estabilizada
- Validaciones mejoradas para límite de 4 miembros por equipo
- Sistema de imágenes para clases y razas implementado
- Layout responsive mejorado para móviles
- Optimización del CSS para mejor rendimiento

### 🐛 Corregido
- Bugs en la gestión de equipos solucionados
- Problemas de visualización en diferentes resoluciones
- Errores en la validación de creación de personajes

### 🚧 Pendiente para v1.0
- Sistema completo de habilidades (solo 1 funcional actualmente)
- Sistema de inventario e items
- Mecánicas de combate y efectos
- Sistema de misiones completo

---

## [0.8.x] - Versiones Anteriores

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
