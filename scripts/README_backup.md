# 🔄 Scripts de Migración - Equipos por Clase

## 📋 Descripción

Scripts para migrar equipos existentes de sistema global a sistema por clase específica, siguiendo el modelo de ClassCraft original.

## 📁 Archivos

### 1. `migrar-equipos-a-clases.js` - Migración Básica
- **Estrategia:** Asigna primera clase activa del profesor a cada equipo
- **Uso:** Migración simple y rápida
- **Seguro:** No modifica equipos que ya tienen `clase_id`

### 2. `migrar-equipos-inteligente.js` - Migración Inteligente ⭐
- **Estrategia:** Analiza miembros del equipo para encontrar la clase correcta
- **Ventajas:** Mayor precisión en la asignación
- **Incluye:** Función de rollback para deshacer cambios

## 🚀 Uso

### Ejecutar Migración Inteligente (Recomendado)
```bash
cd ClassCraft
node scripts/migrar-equipos-inteligente.js
```

### Ejecutar Migración Básica
```bash
cd ClassCraft
node scripts/migrar-equipos-a-clases.js
```

### Rollback (Deshacer Migración)
```bash
cd ClassCraft
node scripts/migrar-equipos-inteligente.js rollback
```

## 🔍 Qué hace la Migración Inteligente

1. **Análisis por Miembros:**
   - Busca clases donde están los miembros del equipo
   - Asigna la clase con más miembros coincidentes

2. **Fallback por Profesor:**
   - Si no encuentra por miembros, usa primera clase del profesor
   - Si profesor no tiene clases, deja como global

3. **Estadísticas Completas:**
   - Muestra antes/después de la migración
   - Detalle de cada equipo procesado

## 📊 Output Esperado

```
🧠 INICIANDO MIGRACIÓN INTELIGENTE EQUIPOS → CLASES
=================================================

✅ Conectado a MongoDB

📊 EQUIPOS ENCONTRADOS SIN CLASE: 3

🔍 Analizando equipo: "Los Dragones"
   Profesor: Juan Pérez
   Miembros: 3
   ✅ Clase encontrada por miembros: "Matemáticas 5A" (3/3 miembros coinciden)
   ✅ MIGRADO → Clase: "Matemáticas 5A" (MATE5A)

🔍 Analizando equipo: "Las Águilas"
   Profesor: Juan Pérez
   Miembros: 2
   📚 Clase asignada por profesor: "Historia 3B" (primera clase activa)
   ✅ MIGRADO → Clase: "Historia 3B" (HIST3B)

=================================================
📊 RESUMEN MIGRACIÓN INTELIGENTE:
✅ Equipos migrados a clases: 2
🌐 Equipos globales: 1
❌ Errores: 0

📈 ESTADÍSTICAS FINALES:
🏫 Total equipos con clase: 2
🌐 Total equipos globales: 1
📊 Total equipos: 3

🎉 ¡MIGRACIÓN INTELIGENTE COMPLETADA!
🚀 Listo para FASE 3: Actualización de API
```

## 🛡️ Seguridad

- ✅ **No destructivo:** Solo modifica equipos sin `clase_id`
- ✅ **Rollback disponible:** Puede deshacer todos los cambios
- ✅ **Logs detallados:** Seguimiento completo del proceso
- ✅ **Validaciones:** Verifica integridad antes de modificar

## 🔄 FASES del Proyecto

- **FASE 1:** ✅ Modelo preparado con `clase_id` opcional
- **FASE 2:** ✅ Scripts de migración (ACTUAL)
- **FASE 3:** 🔄 Actualización API para soportar equipos por clase
- **FASE 4:** 🔄 Actualización Frontend

## ⚠️ Importante

1. **Backup recomendado** antes de ejecutar migración
2. **Servidor debe estar parado** durante migración
3. **Probar en ambiente de desarrollo** primero
4. **Rollback disponible** en caso de problemas

## 🐛 Troubleshooting

### Error: "Cannot connect to MongoDB"
```bash
# Verificar que MongoDB esté corriendo
mongod --version
```

### Error: "Cannot find module"
```bash
# Ejecutar desde directorio ClassCraft
cd ClassCraft
npm install
```

### Equipos no migrados correctamente
```bash
# Hacer rollback y reintentar
node scripts/migrar-equipos-inteligente.js rollback
node scripts/migrar-equipos-inteligente.js
```
