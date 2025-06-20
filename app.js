const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Modelos
const Usuario = require('./models/usuario');
const Personaje = require('./models/personaje');
const ClasePersonaje = require('./models/clasePersonaje');
const Raza = require('./models/raza');
const Habilidad = require('./models/habilidad');
const Inventario = require('./models/inventario');
const Item = require('./models/item');
const Equipo = require('./models/equipo');
const Clase = require('./models/clase');
const Mision = require('./models/mision');
const ProgresoMision = require('./models/progresoMision');
const Titulo = require('./models/titulo');
const Notificacion = require('./models/notificacion');
const ClaseActiva = require('./models/claseActiva');
const EfectoActivo = require('./models/efectoActivo');
const HistorialAccion = require('./models/historialAccion');
const CooldownHabilidad = require('./models/cooldownHabilidad');
const AnimacionActiva = require('./models/animacionActiva');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de logging para todas las rutas de equipos
app.use('/api/equipos', (req, res, next) => {
    console.log(`🚀 REQUEST TO EQUIPOS: ${req.method} ${req.originalUrl}`);
    console.log(`   - Params:`, req.params);
    console.log(`   - Query:`, req.query);
    next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/personajes', require('./routes/personajes'));
app.use('/api/clases', require('./routes/clases'));
app.use('/api/misiones', require('./routes/misiones'));
app.use('/api/titulos', require('./routes/titulos'));
app.use('/api/inventarios', require('./routes/inventarios'));
app.use('/api/equipos-simple', require('./routes/equipos-simple')); // TESTING ENDPOINT SIMPLE
app.use('/api/equipos/test', require('./routes/equipos-test')); // NUEVAS RUTAS DE TESTING V2
app.use('/api/equipos', require('./routes/equipos'));
app.use('/api/dev', require('./routes/dev'));

// Conexión DB
mongoose.connect('mongodb://localhost:27017/classcraft', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB conectado - ClassCraft DB lista!');
});

mongoose.connection.on('error', (err) => {
    console.error('Error MongoDB:', err);
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        message: 'ClassCraft API funcionando!',
        status: 'online',
        modelos_cargados: 18,
        endpoints: {
            test: '/api/test',
            auth: '/api/auth',
            personajes: '/api/personajes',
            clases: '/api/clases',
            misiones: '/api/misiones',
            titulos: '/api/titulos',
            inventarios: '/api/inventarios',
            equipos: '/api/equipos',
            usuarios: '/api/usuarios (legacy)',
            datos: '/api/clases-personaje, /api/razas, /api/habilidades'
        }
    });
});

// Test de modelos
app.get('/api/test', async (req, res) => {
    try {
        const stats = {
            usuarios: await Usuario.countDocuments(),
            personajes: await Personaje.countDocuments(),
            clases_personaje: await ClasePersonaje.countDocuments(),
            razas: await Raza.countDocuments(),
            habilidades: await Habilidad.countDocuments(),
            items: await Item.countDocuments(),
            equipos: await Equipo.countDocuments(),
            clases: await Clase.countDocuments(),
            misiones: await Mision.countDocuments(),
            titulos: await Titulo.countDocuments()
        };
        
        res.json({
            message: 'Todos los modelos funcionando!',
            database_stats: stats,
            mongodb_status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error en test de modelos',
            error: error.message
        });
    }
});

// Setup datos de prueba - INCLUYE LIMPIEZA AUTOMÁTICA
app.get('/api/setup', async (req, res) => {
    try {
        console.log('🔄 SETUP: Limpiando datos existentes...');
        
        // Limpiar datos existentes
        await Usuario.deleteMany({});
        await Personaje.deleteMany({});
        await ClasePersonaje.deleteMany({});
        await Raza.deleteMany({});
        await Habilidad.deleteMany({});
        await Item.deleteMany({});
        await Inventario.deleteMany({});
        await Equipo.deleteMany({});
        await Clase.deleteMany({});
        await Mision.deleteMany({});
        await ProgresoMision.deleteMany({});
        await Titulo.deleteMany({});
        await Notificacion.deleteMany({});
        await ClaseActiva.deleteMany({});
        await EfectoActivo.deleteMany({});
        await HistorialAccion.deleteMany({});
        await CooldownHabilidad.deleteMany({});
        await AnimacionActiva.deleteMany({});
        
        console.log('✅ SETUP: Datos limpiados, creando nuevos datos...');
        
        // Clases de personaje
        const mago = new ClasePersonaje({
            nombre: "mago",
            descripcion: "Maestro de la magia y el conocimiento",
            icono: "mago.png",
            bonificaciones: { salud: 10, energia: 30 },
            stats_base: {
                salud_inicial: 80,
                energia_inicial: 120,
                salud_por_nivel: 8,
                energia_por_nivel: 15
            }
        });
        
        const guerrero = new ClasePersonaje({
            nombre: "guerrero",
            descripcion: "Valiente luchador con gran resistencia",
            icono: "guerrero.png",
            bonificaciones: { salud: 40, energia: 0 },
            stats_base: {
                salud_inicial: 150,
                energia_inicial: 80,
                salud_por_nivel: 20,
                energia_por_nivel: 8
            }
        });
        
        const curandero = new ClasePersonaje({
            nombre: "curandero",
            descripcion: "Sanador que apoya al equipo",
            icono: "curandero.png",
            bonificaciones: { salud: 20, energia: 20 },
            stats_base: {
                salud_inicial: 100,
                energia_inicial: 100,
                salud_por_nivel: 12,
                energia_por_nivel: 12
            }
        });
        
        await mago.save();
        await guerrero.save();
        await curandero.save();
        
        // Razas
        const humano = new Raza({
            nombre: "humano",
            descripcion: "Versátil y equilibrado",
            bono_salud: 10,
            bono_energia: 10,
            icono: "humano.png",
            habilidades_especiales: []
        });
        
        const elfo = new Raza({
            nombre: "elfo",
            descripcion: "Ágil y mágico",
            bono_salud: 5,
            bono_energia: 20,
            icono: "elfo.png",
            habilidades_especiales: []
        });
        
        const enano = new Raza({
            nombre: "enano",
            descripcion: "Resistente y fuerte",
            bono_salud: 25,
            bono_energia: 0,
            icono: "enano.png",
            habilidades_especiales: []
        });
        
        await humano.save();
        await elfo.save();
        await enano.save();
        
        // Habilidades generales
        const vendajeRapido = new Habilidad({
            nombre: "Vendaje Rápido",
            descripcion: "Cura heridas menores rápidamente",
            tipo: "curacion",
            es_general: true,
            clases_permitidas: [],
            nivel_desbloqueo: 1,
            costo_energia: 10,
            cooldown_segundos: 30,
            efectos: [{
                tipo: "curacion",
                valor_puntos: 15,
                objetivo: "self",
                duracion_segundos: 0
            }],
            icono: "vendaje.png",
            animaciones: {
                gif_archivo: "vendaje.gif",
                duracion_ms: 2000,
                pantalla_completa: true,
                posicion: "centro"
            },
            audio: {
                sonido_base: "vendaje.mp3",
                variantes_por_clase: {
                    mago: "mago_curacion.mp3",
                    guerrero: "guerrero_curacion.mp3",
                    curandero: "curandero_curacion.mp3"
                },
                volumen: 0.7,
                simultaneo: true
            },
            categoria_general: "curacion"
        });
        
        const posicionDefensiva = new Habilidad({
            nombre: "Posición Defensiva",
            descripcion: "Reduce el daño recibido temporalmente",
            tipo: "defensa",
            es_general: true,
            clases_permitidas: [],
            nivel_desbloqueo: 2,
            costo_energia: 15,
            cooldown_segundos: 60,
            efectos: [{
                tipo: "defensa",
                valor_puntos: 5,
                objetivo: "self",
                duracion_segundos: 30
            }],
            icono: "escudo.png",
            animaciones: {
                gif_archivo: "defensa.gif",
                duracion_ms: 1500,
                pantalla_completa: false,
                posicion: "centro"
            },
            audio: {
                sonido_base: "defensa.mp3",
                variantes_por_clase: {
                    mago: "mago_defensa.mp3",
                    guerrero: "guerrero_defensa.mp3",
                    curandero: "curandero_defensa.mp3"
                },
                volumen: 0.6,
                simultaneo: true
            },
            categoria_general: "defensa"
        });
        
        const concentracion = new Habilidad({
            nombre: "Concentración",
            descripcion: "Aumenta la energía máxima temporalmente",
            tipo: "utilidad",
            es_general: true,
            clases_permitidas: [],
            nivel_desbloqueo: 3,
            costo_energia: 20,
            cooldown_segundos: 120,
            efectos: [{
                tipo: "utilidad",
                valor_puntos: 25,
                objetivo: "self",
                duracion_segundos: 60
            }],
            icono: "concentracion.png",
            animaciones: {
                gif_archivo: "concentracion.gif",
                duracion_ms: 3000,
                pantalla_completa: true,
                posicion: "centro"
            },
            audio: {
                sonido_base: "concentracion.mp3",
                variantes_por_clase: {
                    mago: "mago_concentracion.mp3",
                    guerrero: "guerrero_concentracion.mp3",
                    curandero: "curandero_concentracion.mp3"
                },
                volumen: 0.5,
                simultaneo: true
            },
            categoria_general: "utilidad"
        });
        
        // Habilidades específicas por clase
        const bolaFuego = new Habilidad({
            nombre: "Bola de Fuego",
            descripcion: "Ataque mágico devastador",
            tipo: "ataque",
            es_general: false,
            clases_permitidas: ["mago"],
            nivel_desbloqueo: 5,
            costo_energia: 30,
            cooldown_segundos: 45,
            efectos: [{
                tipo: "ataque",
                valor_puntos: 35,
                objetivo: "enemigo",
                duracion_segundos: 0
            }],
            icono: "bola_fuego.png",
            animaciones: {
                gif_archivo: "bola_fuego.gif",
                duracion_ms: 4000,
                pantalla_completa: true,
                posicion: "centro"
            },
            audio: {
                sonido_base: "fuego.mp3",
                variantes_por_clase: {
                    mago: "mago_fuego.mp3"
                },
                volumen: 0.8,
                simultaneo: true
            }
        });
        
        const golpePotente = new Habilidad({
            nombre: "Golpe Potente",
            descripcion: "Ataque físico con gran fuerza",
            tipo: "ataque",
            es_general: false,
            clases_permitidas: ["guerrero"],
            nivel_desbloqueo: 4,
            costo_energia: 25,
            cooldown_segundos: 40,
            efectos: [{
                tipo: "ataque",
                valor_puntos: 40,
                objetivo: "enemigo",
                duracion_segundos: 0
            }],
            icono: "espada.png",
            animaciones: {
                gif_archivo: "golpe.gif",
                duracion_ms: 2500,
                pantalla_completa: true,
                posicion: "centro"
            },
            audio: {
                sonido_base: "golpe.mp3",
                variantes_por_clase: {
                    guerrero: "guerrero_golpe.mp3"
                },
                volumen: 0.9,
                simultaneo: true
            }
        });
        
        const curacionGrupal = new Habilidad({
            nombre: "Curación Grupal",
            descripcion: "Cura a todo el equipo",
            tipo: "curacion",
            es_general: false,
            clases_permitidas: ["curandero"],
            nivel_desbloqueo: 6,
            costo_energia: 40,
            cooldown_segundos: 90,
            efectos: [{
                tipo: "curacion",
                valor_puntos: 20,
                objetivo: "equipo",
                duracion_segundos: 0
            }],
            icono: "curacion_grupal.png",
            animaciones: {
                gif_archivo: "curacion_grupal.gif",
                duracion_ms: 3500,
                pantalla_completa: true,
                posicion: "centro"
            },
            audio: {
                sonido_base: "curacion.mp3",
                variantes_por_clase: {
                    curandero: "curandero_curacion_grupal.mp3"
                },
                volumen: 0.7,
                simultaneo: true
            }
        });
        
        await vendajeRapido.save();
        await posicionDefensiva.save();
        await concentracion.save();
        await bolaFuego.save();
        await golpePotente.save();
        await curacionGrupal.save();
        
        // Asignar habilidad única a cada clase
        mago.habilidad_unica = bolaFuego._id;
        guerrero.habilidad_unica = golpePotente._id;
        curandero.habilidad_unica = curacionGrupal._id;
        
        await mago.save();
        await guerrero.save();
        await curandero.save();
        
        // Usuarios de prueba
        const profesor = new Usuario({
            nombre: "Prof. García",
            email: "profesor@test.com",
            password: "123456",
            rol: "profesor",
            nivel: 1,
            experiencia: 0
        });
        
        const estudiante1 = new Usuario({
            nombre: "Ana López",
            email: "ana@test.com",
            password: "123456",
            rol: "estudiante",
            nivel: 3,
            experiencia: 150
        });
        
        const estudiante2 = new Usuario({
            nombre: "Carlos Ruiz",
            email: "carlos@test.com",
            password: "123456",
            rol: "estudiante",
            nivel: 2,
            experiencia: 75
        });
        
        const estudiante3 = new Usuario({
            nombre: "María Santos",
            email: "maria@test.com",
            password: "123456",
            rol: "estudiante",
            nivel: 4,
            experiencia: 200
        });
        
        const estudiante4 = new Usuario({
            nombre: "Pedro Morales",
            email: "pedro@test.com",
            password: "123456",
            rol: "estudiante",
            nivel: 1,
            experiencia: 25
        });
        
        await profesor.save();
        await estudiante1.save();
        await estudiante2.save();
        await estudiante3.save();
        await estudiante4.save();
        
        // Items básicos
        const pocionSalud = new Item({
            nombre: "Poción de Salud",
            descripcion: "Restaura 25 puntos de salud",
            tipo: "pocion",
            valor: 50,
            nivel_minimo: 1,
            icono: "pocion_salud.png",
            apilable: true,
            efectos: [{
                tipo: "curacion",
                valor: 25,
                duracion_segundos: 0
            }],
            rareza: "comun"
        });
        
        const pergaminoExperiencia = new Item({
            nombre: "Pergamino de Experiencia",
            descripcion: "Otorga 10 puntos de experiencia",
            tipo: "pergamino",
            valor: 100,
            nivel_minimo: 1,
            icono: "pergamino_xp.png",
            apilable: true,
            efectos: [{
                tipo: "xp",
                valor: 10,
                duracion_segundos: 0
            }],
            rareza: "raro"
        });
        
        await pocionSalud.save();
        await pergaminoExperiencia.save();
        
        // Clase de prueba
        const claseMatematicas = new Clase({
            nombre: "Matemáticas 5to A",
            codigo_clase: "MATE5A",
            profesor_id: profesor._id,
            estudiantes: [estudiante1._id, estudiante2._id, estudiante3._id, estudiante4._id],
            descripcion: "Clase de matemáticas para 5to grado",
            activa: true,
            configuracion: {
                max_estudiantes_por_equipo: 4,
                sistema_puntos: {
                    xp_participacion: 5,
                    xp_tarea_completada: 15,
                    xp_bonus_equipo: 10
                },
                habilidades_habilitadas: true,
                modo_competitivo: true
            }
        });
        
        await claseMatematicas.save();
        
        res.status(200).json({
            message: "Sistema ClassCraft configurado exitosamente!",
            datos_creados: {
                clases_personaje: 3,
                razas: 3,
                habilidades: 6,
                usuarios: 5,
                items: 2,
                clases: 1
            },
            usuarios_prueba: {
                profesor: "profesor@test.com / 123456",
                estudiantes: [
                    "ana@test.com / 123456",
                    "carlos@test.com / 123456", 
                    "maria@test.com / 123456",
                    "pedro@test.com / 123456"
                ]
            },
            clase_codigo: "MATE5A",
            proximos_pasos: [
                "POST /api/usuarios/login - Para autenticarse",
                "POST /api/personajes/crear - Para crear personajes",
                "GET /api/habilidades - Para ver habilidades disponibles"
            ]
        });
        
    } catch (error) {
        console.error('Error en setup:', error);
        res.status(500).json({
            error: "Error configurando sistema",
            details: error.message
        });
    }
});

// Auth básico
app.post('/api/usuarios/register', async (req, res) => {
    try {
        const { nombre, email, password, rol = 'estudiante' } = req.body;
        
        const usuarioExiste = await Usuario.findOne({ email });
        if (usuarioExiste) {
            return res.status(400).json({ error: 'Email ya registrado' });
        }
        
        const usuario = new Usuario({ nombre, email, password, rol });
        await usuario.save();
        
        res.status(201).json({
            message: 'Usuario registrado!',
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/usuarios/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        
        const passwordValido = await usuario.compararPassword(password);
        if (!passwordValido) {
            return res.status(400).json({ error: 'Password incorrecto' });
        }
        
        // Actualizar última conexión
        usuario.ultima_conexion = new Date();
        await usuario.save();
        
        res.json({
            message: 'Login exitoso!',
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                nivel: usuario.nivel,
                experiencia: usuario.experiencia
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD personajes
app.post('/api/personajes/crear', async (req, res) => {
    try {
        const { usuario_id, clase_personaje_id, raza_id } = req.body;
        
        // Verificar que no tenga personaje
        const personajeExiste = await Personaje.findOne({ usuario_id });
        if (personajeExiste) {
            return res.status(400).json({ error: 'Usuario ya tiene personaje' });
        }
        
        const personaje = new Personaje({
            usuario_id,
            clase_personaje_id,
            raza_id,
            salud_actual: 100,
            salud_maxima: 100,
            energia_actual: 50,
            energia_maxima: 50,
            nivel: 1,
            experiencia: 0
        });
        
        await personaje.save();
        
        // Crear inventario
        const inventario = new Inventario({
            personaje_id: personaje._id,
            capacidad_max: 20,
            monedas: 100,
            items: []
        });
        await inventario.save();
        
        res.status(201).json({
            message: 'Personaje creado!',
            personaje: personaje
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/personajes/:usuario_id', async (req, res) => {
    try {
        const personaje = await Personaje.findOne({ usuario_id: req.params.usuario_id })
            .populate('clase_personaje_id')
            .populate('raza_id')
            .populate('equipo_id');
            
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }
        
        const inventario = await Inventario.findOne({ personaje_id: personaje._id });
        
        res.json({
            personaje: personaje,
            inventario: inventario
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener clases y razas
app.get('/api/clases-personaje', async (req, res) => {
    try {
        const clases = await ClasePersonaje.find();
        res.json(clases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/razas', async (req, res) => {
    try {
        const razas = await Raza.find();
        res.json(razas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Habilidades
app.get('/api/habilidades', async (req, res) => {
    try {
        const habilidades = await Habilidad.find();
        res.json(habilidades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        error: 'Algo salio mal',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado',
        available_routes: [
            'GET /',
            'GET /api/test',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/profile',
            'GET /api/personajes/mi-personaje',
            'POST /api/personajes/crear',
            'PUT /api/personajes/avatar',
            'POST /api/personajes/usar-habilidad',
            'GET /api/personajes/stats',
            'POST /api/clases/crear',
            'POST /api/clases/unirse/:codigo',
            'GET /api/clases/mis-clases',
            'GET /api/clases/:id/estudiantes',
            'PUT /api/clases/:id/estudiante/:estudianteId/xp',
            'GET /api/clases-personaje',
            'GET /api/razas',
            'GET /api/habilidades'
        ]
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
CLASSCRAFT SERVER RUNNING!
Puerto: ${PORT}
URL: http://localhost:${PORT}
Test: http://localhost:${PORT}/api/test
MongoDB: localhost:27017/classcraft
`);
});

module.exports = app;