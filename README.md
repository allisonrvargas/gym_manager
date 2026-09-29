#  Gym Manager CLI  

Aplicación de línea de comandos en **Node.js** para que un entrenador personal o gimnasio gestione de forma integral a sus **clientes**, **planes de entrenamiento**, **contratos**, **seguimiento físico**, **nutrición** y **finanzas**, con persistencia en **MongoDB** usando el driver oficial y **transacciones reales**.

> 🎥 **Video de presentación:** [ENLACE AL VIDEO](https://drive.google.com/drive/folders/1zbrFOXl5XpliZLcQYnjxDwk0e4WxWL_P?usp=drive_link) *(máx. 7 minutos)*
>  **Planeación Scrum (PDF):** [`docs/Planeacion_Scrum.pdf`](docs/Planeacion_Scrum.pdf)
>  **Tablero Scrum (ClickUp):** [ENLACE AL TABLERO](https://app.clickup.com/...)

---

##  Tabla de contenido
1. [Descripción](#-descripción)
2. [Funcionalidades](#-funcionalidades)
3. [Requisitos](#-requisitos)
4. [Instalación](#-instalación)
5. [Uso](#-uso)
6. [Estructura del proyecto](#-estructura-del-proyecto)
7. [Arquitectura](#-arquitectura)
8. [Principios SOLID aplicados](#-principios-solid-aplicados)
9. [Patrones de diseño](#-patrones-de-diseño)
10. [Modelo de datos y validaciones](#-modelo-de-datos-y-validaciones)
11. [Transacciones y consistencia de datos](#-transacciones-y-consistencia-de-datos)
12. [Reglas de negocio y estados](#-reglas-de-negocio-y-estados)
13. [Consideraciones técnicas](#-consideraciones-técnicas)
14. [Pruebas](#-pruebas)
15. [Créditos](#-créditos)

---

##  Descripción

Gym Manager CLI centraliza la operación de un gimnasio en una sola herramienta de consola:

- Registrar clientes y asignarles uno o varios planes de entrenamiento.
- Generar **automáticamente un contrato** cada vez que se asigna un plan.
- Registrar avances semanales (peso, grasa, medidas, fotos, comentarios) y ver el progreso cronológico.
- Crear planes de alimentación, registrar alimentos diarios y consultar reportes semanales.
- Llevar ingresos y egresos, con balances por fechas y por cliente.

Todas las operaciones críticas se ejecutan en **transacciones de MongoDB**: si algo falla, se hace *rollback* y los datos quedan exactamente como estaban.

##  Funcionalidades

| Módulo | Operaciones |
|---|---|
|  **Clientes** | Crear, listar, ver detalle, actualizar, eliminar (transaccional), asignar varios planes |
|  **Planes** | Crear (nombre, duración, metas, nivel, precio), listar, actualizar, inactivar, eliminar, asignar a varios clientes |
|  **Contratos** | Generación automática al asignar, ver detalle e historial, **renovar**, **finalizar**, **cancelar con rollback** |
|  **Seguimiento** | Registrar avance semanal, progreso cronológico con variaciones y gráfico, eliminar con rollback si rompe la consistencia |
|  **Nutrición** | Plan de alimentación por cliente/contrato, registro de alimentos por día y comida, reporte semanal vs. objetivo |
|  **Finanzas** | Ingresos (mensualidades, sesiones), egresos (servicios, suplementos, gastos), anulación, balance por fechas y por cliente |
|  **Sistema** | Historial de comandos de la sesión, auditoría de eventos en la colección `auditoria` |

##  Requisitos

- **Node.js 18+**
- **MongoDB 6+ como Replica Set** (las transacciones no funcionan en un servidor *standalone*). Opciones:
  - Docker (recomendado): el `docker-compose.yml` incluido levanta un replica set de un nodo.
  - MongoDB Atlas (el tier gratuito ya es un replica set).

##  Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/<usuario>/gym-manager-cli.git
cd gym-manager-cli

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env      # en Windows: copy .env.example .env

# 4. Levantar MongoDB como replica set (si usa Docker)
npm run db:up             # espersr ~10 s la primera vez mientras se inicializa rs0

# 5. (Opcional) cargar datos de demostración
npm run seed:reset
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `MONGO_URI` | Cadena de conexión (replica set) | `mongodb://localhost:27017/?directConnection=true` |
| `DB_NAME` | Nombre de la base de datos | `gym_manager` |
| `CURRENCY` | Moneda ISO 4217 | `COP` |
| `LOCALE` | Formato numérico | `es-CO` |
| `TIMEZONE` | Zona horaria de los reportes | `America/Bogota` |
| `DEBUG` | Muestra stack traces | `false` |

##  Uso

```bash
npm start
```

Navegue con las flechas ↑ ↓, seleccione con **Enter** y marque opciones múltiples con **Espacio**. Cada transacción muestra en consola si fue confirmada ( COMMIT) o revertida (↩ ROLLBACK).

**Flujo sugerido de demostración:**
1. `Planes → Crear plan` · 2. `Clientes → Registrar cliente` · 3. `Planes → Asignar plan a clientes` (se genera el contrato) · 4. `Seguimiento → Registrar avance` · 5. `Finanzas → Registrar ingreso (mensualidad)` · 6. `Contratos → Cancelar plan` (rollback del seguimiento).

##  Estructura del proyecto

```
gym-manager-cli/
├── index.js                  # Punto de entrada: conexión, observadores y menú
├── config/
│   ├── env.js                # Carga y valida variables de entorno (dotenv)
│   ├── Database.js           # Singleton de conexión + verificación de replica set + índices
│   └── container.js          # Composition Root: inyección de dependencias
├── models/                   # Definición del modelo de datos con validaciones por campo
│   ├── BaseModel.js          # Clase base: build, buildUpdate, sanitize, validate
│   ├── Cliente.js · PlanEntrenamiento.js · Contrato.js · Seguimiento.js
│   ├── PlanNutricional.js · RegistroAlimento.js · Movimiento.js
│   ├── constantes.js         # Enumeraciones (niveles, estados, categorías…)
│   └── patrones.js           # Expresiones regulares de formato
├── repositories/             # Patrón Repository: único acceso al driver de MongoDB
├── services/                 # Lógica de negocio y transacciones
├── factories/                # Patrón Factory: contratos y movimientos
├── commands/                 # Patrón Command: cada opción del menú es una clase
├── events/                   # Patrón Observer: EventBus + observadores
├── utils/                    # Validator, TransactionManager, máquina de estados, UI, prompts
├── scripts/seed.js           # Datos de demostración
├── tests/                    # Pruebas unitarias (node:test)
├── docs/                     # Planeación Scrum, guion del video, guías
├── docker-compose.yml        # MongoDB replica set
├── .env.example · .gitignore · package.json
```

##  Arquitectura

Arquitectura en capas; cada capa solo conoce a la de abajo:

```
 Usuario ─► commands/ (UI: inquirer, chalk)
               │  llama a
               ▼
           services/ (reglas de negocio + transacciones) ──emite──► events/ (observadores)
               │  usa                        │ usa
               ▼                             ▼
         repositories/ ──► MongoDB      factories/ + models/ (validación)
```

- Los **servicios nunca imprimen** en consola y los **comandos nunca acceden** a MongoDB.
- `config/container.js` es el único lugar donde se instancian clases concretas.

##  Principios SOLID aplicados

| Principio | Dónde | Cómo |
|---|---|---|
| **S** – Responsabilidad única | `services/*`, `repositories/*`, `utils/ui.js`, `utils/Validator.js` | Cada clase tiene un solo motivo de cambio: `ContratoService` solo gestiona el ciclo de vida del contrato; `FinanzasService` solo dinero; `Validator` solo valida; `ui` solo presenta. |
| **O** – Abierto/Cerrado | `commands/MenuCommand.js`, `events/EventBus.js`, `models/BaseModel.js` | Nueva opción de menú = nueva clase `Command`, sin tocar el menú. Nuevo observador (p. ej. correo) = nueva clase suscrita, sin tocar servicios. Nuevo modelo = extender `BaseModel`. |
| **L** – Sustitución de Liskov | `repositories/*Repository.js`, `commands/*Command.js`, `models/*` | Cualquier repositorio concreto funciona donde se espera `BaseRepository`; cualquier comando (incluido `MenuCommand`) puede ser ejecutado por `CommandInvoker`; todos los modelos responden a `build()`. |
| **I** – Segregación de interfaces | `repositories/*`, `Selectores` | Los repositorios específicos exponen solo consultas de su dominio (`aplicarPago`, `resumenPorDia`); los servicios reciben únicamente las dependencias que usan. |
| **D** – Inversión de dependencias | `config/container.js` + constructores de servicios | Los servicios reciben repositorios, `TransactionManager`, fábricas y `eventBus` por constructor; no hacen `new` de infraestructura. Esto permite probarlos con dobles. |

##  Patrones de diseño

| Patrón | Archivos | Propósito |
|---|---|---|
| **Repository** | `repositories/BaseRepository.js` y derivados | Aísla el acceso a datos; los servicios no conocen el driver. Todos los métodos aceptan `session` para participar en transacciones. |
| **Factory** | `factories/ContratoFactory.js`, `factories/MovimientoFactory.js` | Genera automáticamente el contrato (fechas, precio, saldo, condiciones, estado inicial) y los movimientos financieros con valores por defecto. |
| **Command** | `commands/Command.js`, `CommandInvoker.js`, `*Commands.js` | Cada opción del menú es un objeto con `execute()`. El invocador centraliza errores y guarda historial. |
| **Composite** | `commands/MenuCommand.js` | Un menú es un comando que contiene comandos: los submenús se anidan sin código especial. |
| **Observer** | `events/EventBus.js`, `ConsolaObserver.js`, `AuditoriaObserver.js` | Los servicios publican eventos (`contrato:cancelado`, `transaccion:rollback`…) y los observadores reaccionan (consola, auditoría). |
| **Singleton** | `config/Database.js` | Una única conexión `MongoClient` compartida; constructor protegido con token privado. |
| **State (máquina de estados)** | `utils/MaquinaEstadosContrato.js` | Define las transiciones legales del contrato. |

##  Modelo de datos y validaciones

Cada modelo en `/models` declara sus reglas como un objeto JavaScript. `utils/Validator.js` las interpreta:

```js
```

| Regla | Ejemplo de uso |
|---|---|
| `type` (`string`, `number`, `integer`, `boolean`, `date`, `objectId`, `array`, `object`) | Todos los campos |
| `required` | `nombre`, `documento`, `peso`… |
| `enum` | `nivel`, `estado`, `comida`, `metodoPago` |
| `min` / `max` / `decimals` | `peso` (25–350 kg), `precioMensual` (2 decimales) |
| `minLength` / `maxLength` | `condiciones`, `metas` (1–10 elementos) |
| `pattern` + `message` | `email`, `documento`, `telefono`, `fotos` |
| `items` | Arreglos tipados (`metas`, `fotos`, `planes`) |
| `schema` | Objetos anidados (`medidas`, `historialEstados`) |
| `validate(valor, doc)` | Edad válida, categoría según tipo de movimiento |
| `reglas(doc)` (nivel modelo) | `fechaFin > fechaInicio`, `pagado + saldo = precio`, mensualidad requiere contrato |

Además, `BaseModel.sanitize` descarta campos no declarados y `buildUpdate` impide modificar campos inmutables (`planes`, `creadoEn`).

**Colecciones:** `clientes`, `planes`, `contratos`, `seguimientos`, `planesNutricionales`, `registrosAlimentos`, `movimientos`, `auditoria`.

##  Transacciones y consistencia de datos

`utils/TransactionManager.js` encapsula el ciclo `startTransaction → commitTransaction / abortTransaction` con `readConcern: snapshot` y `writeConcern: majority`, y reintenta errores `TransientTransactionError`. En el código, cada acción crítica está marcada con el comentario **` ACCIÓN CRÍTICA`**.

| Acción crítica | Servicio | Qué garantiza la transacción |
|---|---|---|
| Asignar plan(es) | `ContratoService.asignar` | Contrato + `cliente.planes` + `plan.clientes` se crean juntos; si falla una asignación, no se crea ninguna. |
| **Cancelar plan** | `ContratoService.cancelar` | Elimina avances, planes nutricionales y alimentos del contrato, lo marca `cancelado` y rompe la asociación. Todo o nada. |
| Renovar | `ContratoService.renovar` | Cierra el contrato actual y genera el nuevo de forma atómica. |
| Finalizar | `ContratoService.finalizar` | Cambia estado y desasocia solo si el saldo es cero. |
| Registrar pago | `FinanzasService.registrarIngreso` | Inserta el movimiento y descuenta el saldo del contrato en la misma transacción. |
| Anular pago | `FinanzasService.anular` | Marca el movimiento anulado y devuelve el saldo al contrato. |
| Registrar avance | `SeguimientoService.registrar` | Inserta el avance y actualiza el contador del contrato. |
| **Eliminar avance** | `SeguimientoService.eliminar` | Borra y luego verifica invariantes; si alguna se rompe → **rollback** y el registro reaparece. |
| Eliminar cliente / plan | `ClienteService.eliminar`, `PlanService.eliminar` | Verifica dependencias y borra en cascada de forma atómica. |

**Defensas adicionales:**
- **Índices únicos** (`config/Database.js`): documento y email de cliente, nombre de plan, un solo avance por semana y contrato, y un índice **parcial** que impide dos contratos *activos* del mismo cliente y plan.
- **Actualizaciones condicionadas** (control optimista): `cambiarEstado` filtra por el estado esperado y `aplicarPago` exige `saldoPendiente >= monto`; si `modifiedCount !== 1` se aborta la transacción.
- **Montos redondeados en la base de datos** con `$round` en un pipeline de actualización (evita errores de punto flotante).
- **Snapshots** (`clienteNombre`, `planNombre`) en el contrato para conservar el histórico aunque se borren clientes o se renombren planes.

##  Reglas de negocio y estados

Máquina de estados del contrato (`utils/MaquinaEstadosContrato.js`):

```
activo ──► finalizado ──► renovado
  │  └─────────────────► renovado
  └──► cancelado (terminal)
```

- Un cliente no puede tener dos contratos **activos** del mismo plan.
- No se asignan planes **inactivos**.
- Solo se **finaliza** o **renueva** un contrato con saldo pendiente en cero.
- Un pago de mensualidad no puede superar el saldo pendiente ni aplicarse a un contrato no activo.
- Los movimientos financieros **no se borran**, se **anulan** (trazabilidad).
- Los avances solo se registran en contratos activos, dentro de la vigencia, sin fechas futuras y uno por semana.
- No se elimina la **semana 1** (línea base) si hay semanas posteriores, ni avances de contratos cerrados.
- Un contrato activo tiene como máximo **un** plan nutricional activo.
- No se elimina un cliente con contratos activos, ni un plan con contratos (se inactiva).

##  Consideraciones técnicas

- **ES Modules** (`"type": "module"`), Node 18+.
- **Librerías npm:** `mongodb` (driver oficial, sin mongoose), `inquirer` (menús interactivos), `chalk` (colores), `cli-table3` (tablas), `ora` (spinner), `dayjs` (fechas, semanas ISO), `dotenv` (configuración).
- El precio del contrato = `precioMensual × ceil(duracionSemanas / 4)`.
- Las fechas se guardan en UTC; los reportes agrupan por día con la zona horaria de `TIMEZONE` (`$dateToString`).
- Los datos se validan dos veces: en el prompt (experiencia de usuario) y en `/models` (fuente de verdad).
- La auditoría se escribe después del commit, así nunca registra como exitosa una operación revertida.

##  Pruebas

```bash
npm test
```

Pruebas unitarias con `node:test` (sin dependencias) para validaciones de modelos, generación de contratos y máquina de estados.


