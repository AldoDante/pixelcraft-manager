# Manual Técnico y Operativo — Suite PixelCraft Manager (Base de Conocimiento para IA)

> **Versión del documento:** 1.0  
> **Última actualización:** 2026  
> **Empresa:** PixelCraft 3D (San Salvador de Jujuy, Argentina)  
> **Socios:** Aldo Dante Antivilo (`dante.acuario79@gmail.com`) y Alejandro Ruiz (`japodeck@gmail.com`)  
> **Propósito de este archivo:** Servir como manual técnico y guía operativa completa para que una Inteligencia Artificial responda dudas de los socios sobre cómo usar cada módulo, herramienta, fórmula y flujo de trabajo de **PixelCraft Manager** y **PixelCraft LED Studio**.

---

## Instrucciones para la IA que consulte este manual

1. **Idioma y tono:** Respondé siempre en español claro (estilo argentino, trato directo y práctico), guiando paso a paso con los **nombres exactos de pestañas, botones y campos** que figuran en este documento.
2. **Fidelidad técnica:** No inventes botones, porcentajes ni funciones que no existan en este manual. Si el usuario pregunta por una función no contemplada, indicalo con claridad y sugerí el camino más cercano disponible dentro de la suite.
3. **Reglas de negocio críticas que nunca debés confundir:**
   - En **Cost Lab**, el margen de ganancia (%) se aplica **solo** sobre `(Filamento + Electricidad + Amortización/Service)`. Los **Extras** (LEDs, acrílico, tornillos, fuentes) y la **Mano de Obra** se suman **al costo/neto sin margen encima**.
   - El **precio final para el cliente** en presupuestos PDF y Catálogo Público se redondea siempre **hacia arriba al múltiplo de $100 ARS** (ejemplo: `$5.120` → `$5.200`).
   - En **Finance**, cada venta se reparte **30% Caja PixelCraft / 35% Aldo Dante / 35% Alejandro Ruiz**. Los porcentajes de los socios (`35%` cada uno) quedan **intactos**: **todos los gastos del taller se descuentan únicamente de Caja PixelCraft (30%)**.
   - En **LED Studio**, el **Nesting** (anidado en camas 3D o en plancha DXF) es siempre **manual/opcional** (nunca se activa solo) para que el operador decida si imprime letra por letra al tamaño máximo o agrupado.

---

## 1. Arquitectura General del Sitio

La plataforma **PixelCraft Manager** está compuesta por dos áreas principales conectadas a **Firebase (Authentication + Firestore)** en tiempo real:

1. **Catálogo Público E-Commerce (`/`)** — Visible para clientes. Muestra los productos marcados como publicados desde la calculadora, con precios redondeados al cliente y carrito de compras.
2. **Panel de Administración Privado (`/admin`)** — Exclusivo para socios autenticados con correo y contraseña en Firebase Authentication. Engloba toda la suite operativa:
   - **`PixelCraft Cost Lab`** — Calculadora de costos de impresión 3D, cartelería LED, historial de proyectos y publicación al catálogo.
   - **`PixelCraft Finance`** — Registro de ventas, reparto automático societario (30/35/35), gastos del taller y balance mensual.
   - **`PixelCraft LED Studio`** — Diseñador CAD 3D paramétrico en el navegador para carteles corpóreos LED, Neon Flex, Lightbox multicolor, letreros salientes y carteles modulares letra por letra, con exportación STL / 3MF / DXF / ZIP y envío directo de métricas a Cost Lab.
   - **`Asistente IA`** — Panel de chat inteligente con acceso en vivo a los números actuales de Cost Lab y Finance, más generación directa de **Presupuestos en PDF**.

---

## 2. Acceso y Navegación del Panel (`/admin`)

### 2.1 Cómo ingresar
1. Desde el Catálogo Público (`/`), hacé clic en el botón **`ACCESO SOCIOS`** arriba a la derecha (o entrá directo a `/admin`).
2. Ingresá tu correo electrónico y contraseña registrados en Firebase Authentication y presioná **`INGRESAR`**.

### 2.2 Barra de navegación superior (`<nav>`)
Una vez logueado, arriba de todo tenés una barra fija con toda la navegación:
- **Logo `P PIXEL CRAFT` (izquierda):** hacer clic vuelve directo a **`Cost Lab`**.
- **Pestañas principales (centro):**
  - **`🧮 Cost Lab`** — Abre `PixelCraft Cost Lab` (Calculadora y Proyectos).
  - **`📊 Finance`** — Abre `PixelCraft Finance` (Ventas, Gastos y Balance). Muestra un badge rojo con la cantidad total de movimientos (ventas + gastos).
  - **`💡 LED Studio`** — Abre `PixelCraft LED Studio` a pantalla completa dentro de su marco redondeado. **Importante:** al cambiar entre `LED Studio` y `Cost Lab`, el estudio 3D **se mantiene vivo en memoria**, así no perdés tu diseño 3D mientras cotizás.
  - **`🤖 Asistente IA`** — Abre o cierra el panel lateral/flotante del Asistente IA.
  - **`🛒 Ver Catálogo`** — Te lleva al Catálogo Público (`/`).
- **Menú de usuario (derecha):**
  - Muestra tu inicial en un círculo, tu correo y una flecha (`▾`).
  - Al hacer clic se despliega tu **Nombre completo** (ej. `Alejandro Ruiz` o `Aldo Dante Antivilo`), tu **email** debajo y el botón **`🚪 Cerrar sesión`**. (Se cierra haciendo clic afuera o con la tecla `Esc`).

---

## 3. Módulo 1: `PixelCraft Cost Lab` (Calculadora de Costos y Presupuestos 3D)

Identidad visual: marco oscuro redondeado con borde cyan (`PixelCraft Cost Lab v1.0 — Calculadora de Costos y Presupuestos 3D`), contador de proyectos guardados e indicador `Firebase Cloud · Sincronizado`.

La pantalla se divide en **3 columnas**:
1. **Izquierda:** `⚙️ AJUSTES GLOBALES (NUBE)`
2. **Centro:** `NUEVA COTIZACIÓN` (formulario + `RESUMEN FINANCIERO`)
3. **Derecha:** `HISTORIAL (N)` (lista de proyectos guardados)

### 3.1 Ajustes Globales (Nube)
Se sincronizan en Firestore para ambos socios al presionar **`💾 GUARDAR AJUSTES`**:
- **Tarifa Luz (EJESA) (`$/kWh`):** valor por defecto `$425/kWh` (basado en boleta real de Jujuy).
- **Margen Base (`%`):** porcentaje sugerido por defecto (`100%`, es decir x2 sobre el costo base).
- **Valores por Máquina (perfiles precargados y editables):**

| Impresora | ID interno | Consumo PLA/PETG | Consumo ABS/ASA | Secador térmico | Valor reposición (defecto) | Vida útil (defecto) | Kit Service c/ 500h (defecto) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Anycubic Kobra Combo (ACE Pro)** | `kobra-combo` | 110 W | 190 W | Sí (+65 W) | $1.100.000 | 3.000 h | $25.000 ($50/h) |
| **Bambu Lab A1 (Stand-alone)** | `bambu-a1` | 110 W | 170 W | No (0 W) | $900.000 | 4.500 h | $30.000 ($60/h) |
| **Snapmaker U1 (Multiherramienta)** | `snapmaker-u1` | 140 W | 210 W | No (0 W) | $1.800.000 | 5.000 h | $35.000 ($70/h) |

### 3.2 Campos del Formulario de Cotización
1. **Tarjeta vinculada a LED Studio (automática):** si enviaste un cartel desde `LED Studio`, aparece arriba una tarjeta verde mostrando el código estructural, `m²` de acrílico, metros de LED, fuente 12V recomendada (`W` y `A`) y metros de cable.
2. **DATOS DEL CLIENTE Y MEDIOS DE PAGO:**
   - `Nombre del Cliente / Empresa` y `Dirección del Cliente` (se usan luego en el PDF de presupuesto y al registrar la venta).
   - Checkboxes de medios de pago aceptados: `Efectivo`, `Transferencia`, `Tarjeta de crédito (MP)`.
3. **SELECCIONAR IMPRESORA:** elegí entre Kobra Combo, Bambu A1 o Snapmaker U1.
4. **Nombre del Proyecto:** nombre descriptivo (ej. *"Cartel Pixel LED"* o *"Soporte Auriculares"*).
5. **Material y Precio Filamento:**
   - Selector `PLA / PETG` o `ABS / ASA` (ajusta automáticamente los Watts de consumo).
   - `$/Kg Filamento`: precio actual del rollo de 1 kg en pesos argentinos.
6. **Peso y Tiempo:** `Gramos` (del laminador o enviados por LED Studio), `Horas` y `Minutos`.
7. **Secado Térmico y Margen %:**
   - `Secado Térmico (+65W ACE)`: solo habilitado si elegiste la Anycubic Kobra Combo.
   - `Margen %`: porcentaje de ganancia libre para ese proyecto (ej. `100`, `150`, `200`).
8. **Extras $, Mano de Obra $, Detalle de extras y Descuento %:**
   - `Extras $`: insumos externos (tiras LED, fuente 12V, acrílico, tornillos, pegamento, imanes).
   - `M. Obra $`: costo de diseño, lijado, soldadura LED o armado.
   - `Detalle de extras`: nota aclaratoria (se completa sola al importar desde LED Studio).
   - `Desc. %`: descuento comercial opcional sobre el precio final.
9. **Switch `🟢 PUBLICAR EN CATÁLOGO E-COMMERCE`:**
   - Al activarlo se despliegan 3 campos públicos: `URL de la foto del producto`, `Descripción comercial para los clientes` y `Tiempo de espera` (ej. *"48hs a 72hs"*).
   - Cuando guardás el proyecto con este switch encendido, aparece automáticamente en el Catálogo Público (`/`).
10. **Botones de acción:**
    - **`CALCULAR Y GUARDAR`** (o **`ACTUALIZAR PROYECTO`** si estás editando): ejecuta el motor de costos, guarda en Firestore y muestra el **RESUMEN FINANCIERO** abajo.
    - **`NUEVO CÁLCULO`**: limpia el formulario para arrancar una cotización nueva.

### 3.3 Fórmulas Exactas del Motor de Costos v2.0
Para cualquier consulta sobre "cómo calcula el precio", estas son las fórmulas exactas:
- **Tiempo decimal (`tImp`):** `Horas + (Minutos / 60)`
- **1. Electricidad (`costoEnergia`):**
  - Pico de arranque inicial (~5 min a 600 W): `arranqueWh = 600 × 0.083 ≈ 49.8 Wh`
  - Consumo total: `energiaKWh = (arranqueWh + (WattsMaterial + WattsSecador) × tImp) / 1000`
  - `costoEnergia = energiaKWh × tarifaKWh`
- **2. Material (`costoMat`):**
  - Agrega **+10% de desperdicio** (purgas, faldas, soportes): `pesoConDesperdicio = pesoTotal × 1.10`
  - `costoMat = pesoConDesperdicio × (precioFilamento / 1000)`
- **3. Amortización y Service (`costoDesgasteYService`):**
  - `costoAmortizacionHora = valorMaquina / vidaUtilHoras`
  - `costoServiceHora = costoService500h / 500`
  - `costoDesgasteYService = tImp × (costoAmortizacionHora + costoServiceHora)`
- **4. Costo Base con Margen (`costoBaseConMargen`):**
  - `costoBaseConMargen = costoMat + costoEnergia + costoDesgasteYService`
- **5. Costo Real de Producción (`costoProduccionTotal`):**
  - `costoProduccionTotal = costoBaseConMargen + insumosExternos + manoObra`
- **6. Ganancia Neta y Precio de Venta:**
  - `gananciaNeta = costoBaseConMargen × (margen / 100)` *(nota: NO aplica margen sobre Extras ni Mano de Obra)*
  - `precioVentaBase = costoProduccionTotal + gananciaNeta`
  - `precioVentaFinal = precioVentaBase × (1 - descuento / 100)`
- **7. Redondeo Comercial al Cliente:**
  - `precioCliente = Math.ceil(precioVentaFinal / 100) × 100` (múltiplo de `$100` hacia arriba).

### 3.4 Historial de Proyectos (Columna Derecha)
- **Editar un proyecto:** hacé clic sobre cualquier tarjeta del historial para cargarlo en el formulario.
- **Pasar a Venta rápida (`💰`):** hacé clic en el ícono `💰` de un proyecto; te lleva directo a **Finance** con el modal de venta ya precargado (proyecto, cliente y precio sugerido redondeado).
- **Eliminar (`🗑️`) / `Borrar Todo`:** elimina un proyecto puntual o limpia el historial (pide confirmación).

---

## 4. Módulo 2: `PixelCraft Finance` (Ventas, Gastos y Balance del Taller)

Identidad visual: marco oscuro redondeado con borde ámbar/dorado (`PixelCraft Finance v1.0 — Ventas, Gastos y Balance del Taller`), contador de ventas/gastos y estado sincronizado con Firebase.

### 4.1 Regla Societaria Oficial
Cada venta cobrada se divide automáticamente así:
- **30% → `Caja PixelCraft`** (fondo operativo del taller).
- **35% → `Aldo Dante`** (ganancia neta del socio).
- **35% → `Alejandro Ruiz`** (ganancia neta del socio).
- **Regla de gastos:** **Todos los gastos del taller se descuentan exclusivamente de `Caja PixelCraft (30%)`**. Los `35%` de cada socio permanecen intactos.
- `Saldo Caja = Aporte Caja (30% de ventas) − Total Gastos`. Si los gastos superan el 30% acumulado, la tarjeta de Caja se muestra en rojo indicando saldo negativo.

### 4.2 Filtros y Botones Superiores
- **Selector `📅 PERÍODO`:** permite elegir **`Todo el histórico`** o filtrar por un mes puntual (`Enero 2026`, `Febrero 2026`, etc.). Cuando filtrás un mes puntual, aparece además una insignia con el **`🏦 Saldo acumulado real en Caja`** (el saldo histórico total real disponible hoy).
- **`+ REGISTRAR VENTA`:** abre el modal de carga de venta:
  - Fecha, Proyecto vinculado (opcional; al elegir uno precarga cliente y precio redondeado), Nombre del cliente, Cantidad, Precio unitario manual (si querés ajustarlo respecto al presupuesto), Método de pago (`Transferencia`, `Efectivo`, etc.).
  - Registra automáticamente quién la cargó (`registradoPor`).
- **`− REGISTRAR GASTO`:** abre el modal de gastos del taller con 7 categorías:
  1. `🧵 Filamento`
  2. `⚡ Luz (EJESA)`
  3. `🔧 Repuestos / Service`
  4. `💡 Insumos LED / Cartelería`
  5. `📦 Packaging / Envíos`
  6. `🛠️ Herramientas / Equipo`
  7. `📌 Publicidad / Otros`

### 4.3 Sub-pestañas Internas
1. **`💰 VENTAS (N)`:** tabla detallada con Fecha, Producto (y cantidad), Cliente, Medio de pago, Total Cobrado, Caja (30%), Aldo (35%), Alejandro (35%) y botón eliminar.
2. **`🧾 GASTOS DEL TALLER (N)`:** listado de egresos del período con categoría, descripción, monto y quién lo registró.
3. **`📊 BALANCE MENSUAL Y CATEGORÍAS`:** evolución mes a mes (ingresos, 30% caja, gastos, saldo neto de caja del mes, 35% por socio) + gráfico/desglose porcentual de en qué categorías se está gastando la Caja.

---

## 5. Módulo 3: `PixelCraft LED Studio` (Diseñador 3D de Carteles Corpóreos LED)

Identidad visual: marco redondeado azul-oscuro (`PixelCraft LED Studio v1.0 — Generador 3D de Carteles Corpóreos LED`) impulsado por motor geométrico **Manifold-3D + Clipper2** (mallas 100% cerradas/watertight listas para imprimir).

### 5.1 Barra Superior del Studio
- **Selector de vista:** **`Modelo 3D`** (escena 3D interactiva) | **`Estudio 2D`** (editor vectorial propio tipo CAD/Illustrator).
- **`Abrir proyecto`** / **`Guardar proyecto`**: guarda y recupera todo el trabajo completo en un archivo portable `.pixel` (geometría, parámetros, colores, ojales, guillotina).
- **`Presets`**: guarda y carga configuraciones favoritas del taller (ej. *"Caja estándar 40 mm"*, *"Neon 6 mm"*, *"Lightbox AMS"*).
- **`Guía rápida`**: ayuda rápida integrada dentro del estudio.

### 5.2 Flujo Guiado de 5 Pasos (Columna Izquierda)

#### Paso `01 Ingresar forma`
Elegís cómo entra el diseño del cliente:
- **`Desde Foto / Logo (JPG, PNG, WhatsApp)`**: vectorizador integrado que convierte imágenes/logos recibidos por WhatsApp en curvas vectoriales limpias (ajustando umbral/suavizado).
- **`SVG / DXF`**: importación directa de archivos vectoriales `.svg` (conservando colores separados si es un SVG multicolor para Lightbox/AMS) o `.dxf`.
- **`Texto`**: escribís texto en **1 o múltiples renglones** (usando `Enter`), elegís tipografía integrada o subís tu propia fuente (`.TTF` / `.OTF`), ajustás altura y espaciado y presionás **`Actualizar texto`**.
- Botones rápidos: **`Estudio 2D`** (editar/dibujar en 2D), **`Nodos SVG`** (editar nodos), **`Restaurar SVG original`**.

#### Selector de `Modo` (arriba de Paso 01) — Los 4 Modos + Ensamblado Modular

##### A) Modo `Letras / Logo Caja` (Cartelería Corpórea Tradicional)
- **Paso `02 Elegir estructura`:** matriz de **6 tipos de Tapa × 12 tipos de Base**:
  - **Tapas:**
    - `L` — Tapa con encastre interior (labio perimetral para acrílico).
    - `F` — Tapa con apoyo a media pared (acrílico rehundido con borde 3D).
    - `C` — Tapa de frente sólido (sin acrílico separado; ideal difusor impreso o multicolor).
    - `C8R` — Letras retroiluminadas **Halo** (frente opaco que ilumina hacia la pared con separadores `8R`).
    - `P` — Tapa de frente perforado estilo marquesina + difusor interior.
    - `Acrylic` — Acrílico directo apoyado sobre la base (`6B` o `7`).
  - **Bases:** `1` (borde exterior), `1B` (borde ext. + PVC), `2` (sin borde), `3` (al ras), `3R` (encastre elevado), `4` (anular PVC), `4R` (elevado + PVC), `5` (PVC encastrable), `6` (doble canal anti-fuga de luz), `6B` (cuerpo completo), `7` (envolvente), `8R` (conectores hembra Halo para pared).
- **Paso `03 Configurar modelo`:** tabs dinámicos (`Acrílico`, `Tapa`, `Base`, `Holgura`) + modificadores creativos:
  - **Imagen / Vinilo en acrílico:** permite superponer un PNG/JPG/WebP sobre el frente para previsualizar vinilo impreso.
  - **Perfil exterior de pared:** `Lisa clásica` vs **`Orgánica / Ripada`** (textura zig-zag en Z respetando `≤ 45°` para imprimir **sin soportes**).
  - **Fondo inclinado (cartel en altura):** bisela la espalda (`5°` a `30°`, hacia abajo o arriba) para fachadas altas.
  - **Revestimiento blanco reflectante:** camisa interna fina en blanco para multiplicar el brillo LED en letras oscuras.

##### A.2) Submodo **`Ensamblar letras`** (`MODULAR-LETRAS` — dentro de `Letras / Logo Caja`)
**¿Para qué sirve?** Cuando un cartel es grande (ej. `400 × 167 mm` o `1 metro`) o tiene **2 renglones** (ej. `PIXEL / CRAFT`), en vez de usar la Guillotina (que parte letras por la mitad), **`Ensamblar letras`** convierte cada letra en un **bloque independiente entero (caja + tapa)** que encastra y se pega contra las letras vecinas (tanto a los costados como entre renglones). Así imprimís **cada letra entera al tamaño máximo de tu cama** y luego armás el cartel completo pegándolas.
- **Cómo activarlo:** botón **`Ensamblar letras`** en la barra superior sobre la cama (HUD), en el Paso `03`, o en `04 Herramientas`. *(Al activarlo apaga automáticamente la Guillotina).*
- **Controles clave:**
  - **Estilo de tapa (1 clic):**
    - `Relieve (Like)` (`+6 mm`): la tapa entra en el escalón interno de la caja y **sobresale en relieve** hacia adelante.
    - `Al ras` (`0 mm`): frente nivelado con la caja.
    - `Embutida` (`-3 mm`, estilo *Pixel Craft*): la tapa encaja **hacia adentro** dejando un borde 3D visible.
  - **Marco exterior por letra (`+3` a `+28 mm`, defecto `8 mm`):** expande el cuerpo de cada letra hasta tocar a sus vecinas creando costuras exactas sin superposiciones. *(Si las letras quedan lejos y no se tocan, el sistema avisa en Consola para subir este valor).*
  - **Profundidad caja Z** (ej. `40 mm`) y **Espesor piso** (ej. `1.5–2 mm`).
  - **Escalón interno** (defecto `10 mm`) y **Ancho apoyo** (`2.5 mm`): repisa interior donde apoya la tapa hueca.
  - **Relieve de tapa sobre caja (`-6` a `+18 mm`)**, **Pared tapa**, **Frente difusor**, **Holgura tapa** (`0.3 mm`) y **Holgura unión letras** (`0.2 mm`).
  - **`Muescas / guías de alineación al pegar`:** crea trabas macho/hembra en las paredes de contacto para que no patinen al pegar.
  - **`Pasacables LED automático entre letras`:** abre ventanas rectangulares internas al ras del piso entre cajas vecinas (`10 × 8 mm` configurable) para pasar la tira LED por dentro.
- **Exportación:** genera `Letra_01_Caja`, `Letra_01_Tapa`, `Letra_02_Caja`, `Letra_02_Tapa`... Cada pieza aparece individualmente en `Ver camas`.

##### B) Modo `Canal Neon Flex`
Para manguera LED Neon Flex de silicona (6 mm u 8 mm):
- **Ancho interior Neon Flex:** típicamente `5.8 mm` (para neon de 6 mm) o `7.8 mm` (para neon de 8 mm).
- **Pared**, **Altura pared** y **Espesor piso separador**.
- **`Pasacables trasero (cara pared)`:** canaleta oculta atrás para cables (defecto `3 × 3 mm`, puentea sin soportes) + `Bajadas automáticas en puntas de tramos abiertos`.
- **`Puentes estructurales auto (unir islas)`:** conecta letras/islas sueltas con puentes planos sin canal delantero y con pasacables trasero continuo.
- **`Trabas de retención (sin pegamento)`:** pestañas biseladas a `45°` dentro del canal para que la manguera encastre a presión sin pegamento y se imprima sin soportes.

##### C) Modo `Lightbox Multicolor (AMS)`
Caja luminosa pensada para impresoras multicolor (Anycubic Kobra Combo / ACE Pro, Bambu AMS):
- **Forma de la caja:** `Rectangular` (con radio de esquinas) o `Silueta del logo` (envuelve exactamente la forma con `Margen / respiro` en vivo y opción de rellenar huecos internos).
- **Modo de la cara frontal:** `Embutida (flush)` (para imprimir boca abajo liso multicolor) o `Relieve`.
- **Tapa trasera:** `Impresa (3D)` (con apoyo interior a `45°` sin soportes y holgura configurable) o `PVC (corte DXF)`.
- **Multicolor automático:** si importás un SVG con varios colores `fill`, cada grupo de color genera su propia capa en el `.3MF` multicolor; si es monocolor, elegís color de cuerpo y color de logo.
- Incluye opción de **Revestimiento blanco reflectante**.

##### D) Modo `Letrero saliente (2 caras)` (Banderola / Blade Sign)
Cartel perpendicular a la pared visible desde ambos lados de la vereda:
- **4 tipos de carcasa:** `Redonda`, `Rectangular`, `Silueta` o `Con rieles` (1 o 2 rieles estructurales que unen letras e islas flotantes como el punto de la `i`).
- **Tipo de frente:** `3D Multicolor (AMS)` o `Acrílico (DXF)`.
- **1 o 2 caras:** en doble cara, la cara trasera se **espeja automáticamente** para que los peatones lean de izquierda a derecha desde ambos sentidos.
- **Soporte a pared:** `Pared a la izquierda` o `Pared a la derecha`, largo del brazo separador y **`Túnel pasacables interno por el brazo (Ø 10 mm)`**.

#### Paso `04 Herramientas`
- **`Editor SVG / Nodos`**: mover, agregar o borrar nodos y trazos.
- **`Optimizador curvas`**: limpia y suaviza vectores con exceso de puntos.
- **`Ojales / Cortes base`** (y pestaña **`Pinos Halo`** en modo `C8R`): agrega orejas/ojales para atornillar a pared, perforaciones de cable, ranuras rectangulares o pines separadores Halo automáticos/manuales.
- **`Ensamblar letras`** *(en modo Caja)*: activa/desactiva el modo modular letra por letra.
- **`Guillotina`**: corta carteles grandes en secciones por tamaño de cama usando **Corte recto** o **Cola de milano** encastrable (dientes adaptativos sobre cada trazo sólido con holgura ajustable).
- **`Iluminación LED`**: mapa visual de colocación de LEDs, metros a comprar y fuente 12V recomendada.
- **`Cotizador`**: cálculo rápido en vivo dentro de Studio + botón verde **`Enviar a Calculadora`** (transfiere todo directo a **Cost Lab**).
- **`Engate Esférico (Perno + Zócalo)`**: generador autónomo de herrajes desmontables a presión para pared (imprimibles en PETG, con vista `Lado a lado`, `Montado` y `Vista de corte` + telemetría de flexión).

### 5.3 Estudio 2D (`Estudio 2D` en barra superior)
Permite diseñar o retocar el cartel desde cero sin salir de PixelCraft:
- Herramientas: Selección (con 8 manijas de escala), Rectángulo, Elipse, Polígono, Estrella, Texto editable y Pluma.
- Reglas en milímetros, referencia de cama de impresión y alineación.
- Operaciones booleanas 2D reales (Clipper2): **`Unir`**, **`Restar`**, **`Intersecar`**.
- Redondeo de esquinas por diámetro de boquilla (`0.4 / 0.6 / 0.8 / 1.2 mm`).
- Paleta de colores AMS, lista de capas y botón **`Enviar a 3D →`** para pasar el dibujo al generador 3D.

### 5.4 Controles del Viewport 3D y Consola
- **Recuadro `Dimensiones` (arriba a la izquierda):** editá en vivo **`Ancho`**, **`Alto`** y **`Profundidad Z`** (en `mm` o `in`), con checkbox `Mantener proporción`.
- **Barra de cama / HUD (arriba al centro):** muestra tamaño de cama, **`Alinear izq.`**, **`90°`**, **`Espejar`** (horizontal), **`Ensamblar letras`** (en modo Caja) y **`Centrar`**. También podés arrastrar el cartel directamente sobre la cama.
- **Cubo de cámara (arriba a la derecha):** vistas rápidas **`ISO`**, **`FRENTE`**, **`ARRIBA`** y **`DORSO`**.
- **Widget `CONSOLA` (abajo a la izquierda):**
  - Pestaña **`Silueta 2D`**: vista superior vectorial.
  - Pestaña **`Corte A–A en vivo`**: plano técnico transversal en vivo con cotas según el modo activo.
  - Mensajes de estado: código estructural, cantidad de piezas, tiempo de generación, verificación `[OK] Mallas cerradas` y alertas de fabricación (ej. trazos finos o letras que superan la cama).
- **Panel `Vista y Materiales` (abajo a la derecha):** colores por pieza, visibilidad (ocultar/mostrar tapas, bases, acrílicos) y deslizador **`Explosionar piezas`** para inspeccionar el encastre interno.

### 5.5 Paso `05 Revisar y exportar` (Barra Inferior)
- **`Enviar a Calculadora` (botón verde, visible dentro de Manager):** envía automáticamente nombre del proyecto, código estructural, gramos de filamento, tiempo estimado, `m²` de acrílico, metros de LED, fuente 12V y cable a **`PixelCraft Cost Lab`** y cambia a esa pestaña.
- **`Exportar Proyecto (.ZIP)`:** descarga paquete completo con todos los `.STL`, planos `.DXF` (si aplica), archivo `.3MF` multicolor y **Ficha Técnica de Taller HTML** (con logo/branding de taller y numeración automática `OS-0001`).
- **`Exportar .3MF`:** descarga directa del archivo `.3MF` multicolor listo para Anycubic Slicer Next, Bambu Studio, OrcaSlicer o PrusaSlicer.
- **`Documentación`**: abre la ficha técnica imprimible (con configuración de logo/nombre de taller y número de orden de servicio `OS`).
- **`Ver camas (N)`**: abre la vista 3D de camas de impresión:
  - Por defecto ubica **cada pieza centrada en su propia cama** (sin nesting forzado).
  - Permite cambiar el perfil de impresora (o agregar nuevas impresoras).
  - Checkbox opcional **`Anidar camas (Nesting)`** (y rotación 90°): si el operador lo activa manualmente, compacta múltiples piezas en menos camas y permite bajar **`.3MF por cama`**.
- **`Plano DXF`**: descarga el corte láser 2D o abre el modal opcional de **Nesting en plancha de acrílico/PVC** (con aprovechamiento de huecos internos).
- **`PNG`** (captura limpia), **`RayX`** (vista rayos X transparente) y **`Luz LED`** (encendido/apagado de iluminación simulada).

---

## 6. Módulo 4: `Asistente IA` Integrado y Presupuestos PDF

- Se abre desde el botón **`🤖 Asistente IA`** en la barra superior (o desde el botón flotante inferior derecho).
- **Lectura en vivo del contexto:** tiene un checkbox para incluir automáticamente los datos actuales de **Cost Lab** (cliente, proyecto, costos, precio redondeado al cliente) y el resumen histórico de **Finance**.
- **Para qué usarlo en el taller:**
  - Redactar mensajes profesionales para enviar por WhatsApp al cliente con el precio ya redondeado.
  - Consultar análisis rápido de márgenes, costos o estado de la caja/ventas.
  - **Generar y compartir Presupuesto Oficial en PDF:** desde el propio panel del Asistente IA podés descargar el **PDF del presupuesto** o compartirlo directo (en celular/navegadores compatibles) con el cliente, mostrando el nombre del socio emisor, datos del cliente, medios de pago seleccionados y el **precio final redondeado al múltiplo de `$100`**.

---

## 7. Catálogo Público E-Commerce (`/`)

- Es la vidriera online de PixelCraft 3D en Jujuy.
- Carga en tiempo real la colección `catalogo_publico` de Firestore.
- **Cómo publicar un producto:** en **Cost Lab**, activá el switch **`🟢 PUBLICAR EN CATÁLOGO E-COMMERCE`** dentro del proyecto, completá URL de imagen, descripción comercial y tiempo de espera, y guardá.
- **Cómo quitar o actualizar un producto:** abrí el proyecto desde el historial de **Cost Lab**, desactivá el switch (o modificá foto/precio/descripción) y presioná **`ACTUALIZAR PROYECTO`**.
- Los clientes pueden ver categoría, material, tiempo estimado, precio redondeado en ARS y presionar **`AGREGAR`** al carrito.

---

## 8. Guías Operativas Rápidas (Playbooks para el Socio)

### Playbook 1: Cotizar una impresión 3D común y mandar PDF
1. Entrá a `/admin` → pestaña **`🧮 Cost Lab`**.
2. Cargá `Nombre del Cliente`, `Dirección` y tildá los `Medios de pago`.
3. Elegí la impresora (`Kobra Combo`, `Bambu A1` o `Snapmaker U1`), escribí el nombre del proyecto, elegí `PLA/PETG` o `ABS/ASA` y cargá el precio del kilo de filamento.
4. Ingresá `Gramos`, `Horas` y `Minutos` del laminador. Si usás Kobra Combo con secado activo, tildá `Secado Térmico (+65W ACE)`.
5. Definí el `Margen %` (ej. `100`), sumá `Extras $` y `M. Obra $` si corresponden, y aplicá `Desc. %` solo si hacés descuento.
6. Presioná **`CALCULAR Y GUARDAR`**.
7. Abrí **`🤖 Asistente IA`** para redactar el mensaje o exportar el **Presupuesto PDF** listo para enviar al cliente.

### Playbook 2: Diseñar un cartel LED en Studio y cotizarlo en Cost Lab
1. Abrí **`💡 LED Studio`**.
2. En Paso `01`, escribí el texto o subí el SVG / foto del cliente; ajustá `Ancho`, `Alto` y `Profundidad Z` en el recuadro `Dimensiones`.
3. Elegí el `Modo` adecuado (`Letras / Logo Caja`, `Canal Neon Flex`, `Lightbox Multicolor` o `Letrero saliente`) y ajustá los parámetros en Paso `03`.
4. Verificá en `CONSOLA` que diga `[OK] Mallas cerradas`.
5. En la barra inferior, presioná **`Enviar a Calculadora`** (verde).
6. El sitio te lleva automáticamente a **`🧮 Cost Lab`** con gramos, tiempo, detalle de acrílico/LED/fuente/cable ya precargados. Solo revisás el precio de los insumos en `Extras $`, sumás `M. Obra $`, cargás los datos del cliente y presionás **`CALCULAR Y GUARDAR`**.

### Playbook 3: Cartel grande o de 2 renglones para imprimir letra por letra (`Ensamblar letras`)
1. En **`💡 LED Studio`** (Modo `Letras / Logo Caja`), escribí el texto en 1 o 2 renglones (ej. `PIXEL` + Enter + `CRAFT`) y fijá el tamaño final real (ej. `500 mm` de ancho).
2. Presioná **`Ensamblar letras`** en el HUD superior (arriba de la cama).
3. En Paso `03`:
   - Elegí el estilo de tapa: **`Relieve (Like)`** si querés que la tapa sobresalga en 3D, **`Al ras`**, o **`Embutida`** si querés que entre hacia adentro.
   - Ajustá **`Marco exterior por letra`** (ej. `8–12 mm`) hasta ver que las cajas vecinas se tocan limpiamente entre letras y entre renglones.
   - Verificá que **`Muescas / guías de alineación`** y **`Pasacables LED automático`** estén tildados.
4. Presioná **`Ver camas`** para revisar cada letra por separado en su cama y descargá el `.ZIP` o `.3MF`.

### Playbook 4: Registrar una venta y ver el reparto de socios
1. Si ya cotizaste el trabajo en **Cost Lab**, hacé clic en el ícono **`💰`** de ese proyecto en el Historial (te abre **Finance** con todo precargado).
2. Si es una venta directa sin cotización previa, andá a **`📊 Finance`** → **`+ REGISTRAR VENTA`**.
3. Confirmá fecha, cliente, cantidad, precio total cobrado y medio de pago, y guardá.
4. Automáticamente el sistema acredita **30% a Caja PixelCraft**, **35% a Aldo Dante** y **35% a Alejandro Ruiz**.

### Playbook 5: Registrar un gasto del taller
1. Entrá a **`📊 Finance`** → **`− REGISTRAR GASTO`**.
2. Elegí la fecha, la categoría (ej. `Filamento`, `Luz (EJESA)`, `Insumos LED / Cartelería`), descripción y monto.
3. Guardá: el gasto se descuenta exclusivamente de **`Caja PixelCraft`** y se actualiza el balance mensual y el saldo acumulado real en Caja.

---

## 9. Preguntas Frecuentes y Solución de Problemas (FAQ)

- **¿Por qué si cargo $10.000 en Extras o Mano de Obra, el precio no sube $20.000 con margen 100%?**  
  Porque en Cost Lab el margen (%) se aplica **solo sobre producción de máquina** (`Filamento + Luz + Desgaste/Service`). Los Extras y la Mano de Obra se suman al neto para no inflar artificialmente insumos comprados a terceros.
- **¿Por qué el precio del PDF o Catálogo es ligeramente más alto que el exacto de la calculadora?**  
  El sistema aplica redondeo comercial hacia arriba al múltiplo de `$100` (`$14.320` → `$14.400`) para entregar números limpios al cliente.
- **¿Un gasto de filamento o luz descuenta mi 35% como socio?**  
  No. Los gastos del taller se descuentan **únicamente de Caja PixelCraft (30%)**. El 35% de Aldo y el 35% de Alejandro permanecen intactos.
- **Si cambio de `LED Studio` a `Cost Lab`, ¿pierdo el cartel 3D que estaba diseñando?**  
  No. El iframe de Studio se mantiene montado en segundo plano mientras navegás entre pestañas (solo se reinicia si recargás toda la página con `F5`). Igual siempre podés guardar un respaldo con **`Guardar proyecto`** (`.pixel`).
- **En `Ensamblar letras`, la Consola dice que las letras todavía no se tocan. ¿Qué hago?**  
  Subí el slider **`Marco exterior por letra (mm)`** en Paso `03` (por ejemplo de `8 mm` a `12–16 mm`) o reducí el espaciado entre letras en Paso `01` hasta que las cajas vecinas hagan contacto.
- **En `LED Studio` aparece "El cartel supera la cama de 240×240 mm". ¿Qué conviene hacer?**  
  Tenés dos caminos según el tipo de cartel:
  1. Si son letras/palabras que entran individualmente en tu cama, activá **`Ensamblar letras`** para imprimir letra por letra entera sin partir letras.
  2. Si una sola pieza/logo gigante supera la cama, activá **`Guillotina`** en `04 Herramientas` (preferentemente con unión **`Cola de milano`**).
- **¿Por qué en `Ver camas` las piezas aparecen de a una por cama y no todas juntas?**  
  Por diseño el nesting NO es automático, para respetar el trabajo letra por letra. Si querés agrupar varias piezas en una misma cama para ahorrar tandas, tildá manualmente **`Anidar camas (Nesting)`** dentro de `Ver camas`.
- **¿Cómo actualizo el valor de la luz de EJESA o el precio de una impresora para ambos socios?**  
  En **`Cost Lab`** → panel izquierdo **`AJUSTES GLOBALES`** → cambiá el valor y presioná **`💾 GUARDAR AJUSTES`**. Se sincroniza en la nube para los dos socios al instante.
