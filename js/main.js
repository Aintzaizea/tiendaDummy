const URL_PRODUCTOS = "https://dummyjson.com/products?limit=0";
const URL_CATEGORIAS = "https://dummyjson.com/products/categories";
const RETRASO_SKELETON_MS = 140;

const MENSAJES_CHAT = {
    bienvenida: "¡Hola! Soy tu asistente. Escribe “ayuda”.",
    fallback: "No entendí esa consulta. Prueba con: “estado de envío”, “hablar con un asistente”, “devolución”, “pedido dañado” o “categorías”.",
    vacio: "Escribe una pregunta para poder ayudarte 🙂"
};

// Estado global de la app.
const estado = {
    categorias: [],
    productos: [],
    productosVisibles: [],
    paginaActual: 1,
    productosPorPagina: 8
};

// Referencias a elementos del DOM.
const ui = {
    logo: document.querySelector("header a"),
    selectCategoria: document.querySelector("#categoria"),
    inputPrecio: document.querySelector("#precioMax"),
    inputNombre: document.querySelector("#nombre"),
    btnBuscar: document.querySelector("#btnBuscar"),
    btnTodos: document.querySelector("#btnTodos"),
    contenedor: document.querySelector("#productos"),
    paginacion: document.querySelector("#paginacion"),
    btnPrev: document.querySelector("#btnPrev"),
    btnNext: document.querySelector("#btnNext"),
    paginasNumeros: document.querySelector("#paginasNumeros"),
    paginaInfo: document.querySelector("#paginaInfo"),
    modal: document.querySelector("#modal"),
    modalImagen: document.querySelector("#modalImagen"),
    modalTitulo: document.querySelector("#modalTitulo"),
    modalPrecio: document.querySelector("#modalPrecio"),
    modalDescripcion: document.querySelector("#modalDescripcion"),
    modalCategoria: document.querySelector("#modalCategoria"),
    btnCerrarModal: document.querySelector("#btnCerrarModal"),
    btnAyuda: document.querySelector("#btnAyuda"),
    chatBot: document.querySelector("#chatbot"),
    btnCerrarChat: document.querySelector("#btnCerrarChat"),
    respuesta: document.querySelector(".respuesta"),
    pregunta: document.querySelector("#pregunta"),
    btnEnviar: document.querySelector("#btnEnviar")
};

let tokenRenderSkeleton = 0;

// -------------------- Utilidades --------------------

function normalizarTexto(texto = "") {
    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function capitalizar(texto = "") {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
}

function escaparHtml(texto = "") {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function incluyeAlguno(texto, candidatos = []) {
    return candidatos.some(function(candidato) {
        return texto.includes(candidato);
    });
}

function agregarEvento(elemento, nombreEvento, callback) {
    if (!elemento) return;
    elemento.addEventListener(nombreEvento, callback);
}

function esperar(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

// -------------------- Render catálogo --------------------

function mostrarEstado(mensaje, clase) {
    if (!ui.contenedor) return;
    ui.contenedor.innerHTML = `<p class="${clase}">${mensaje}</p>`;
}

function mostrarSkeletonCarga(cantidad = estado.productosPorPagina) {
    if (!ui.contenedor) return;

    const total = Math.max(4, cantidad);
    const tarjetas = Array.from({ length: total }, function() {
        return `
            <article class="pintado skeleton-card" aria-hidden="true">
                <div class="skeleton-line skeleton-titulo"></div>
                <div class="skeleton-img"></div>
                <div class="skeleton-line skeleton-precio"></div>
                <div class="skeleton-line skeleton-categoria"></div>
            </article>
        `;
    });

    ui.contenedor.innerHTML = tarjetas.join("");
    if (ui.paginacion) ui.paginacion.style.display = "none";
}

async function renderizarConSkeleton(callback, cantidadSkeleton = estado.productosPorPagina) {
    const tokenActual = ++tokenRenderSkeleton;

    mostrarSkeletonCarga(cantidadSkeleton);
    await esperar(RETRASO_SKELETON_MS);

    if (tokenActual !== tokenRenderSkeleton) return null;
    return callback();
}

function crearTarjetaProducto(producto) {
    const titulo = producto.title || "Producto";
    const miniatura = producto.thumbnail || "";
    const precio = Number(producto.price);

    return `
        <a class="pintado" href="#" aria-label="Ver ${titulo}" data-id="${producto.id}">
            <h3>${titulo}</h3>
            <img src="${miniatura}" alt="${titulo}">
            <p>${Number.isFinite(precio) ? precio : "-"} €</p>
            <p>${capitalizar(producto.category)}</p>
        </a>
    `;
}

function renderizarProductos(lista) {
    if (!ui.contenedor) return;

    if (!Array.isArray(lista) || lista.length === 0) {
        mostrarEstado("No hay resultados de búsqueda", "sin-resultados");
        if (ui.paginacion) ui.paginacion.style.display = "none";
        return;
    }

    ui.contenedor.innerHTML = lista.map(crearTarjetaProducto).join("");
    if (ui.paginacion) ui.paginacion.style.display = "flex";
}

// -------------------- Paginación --------------------

function obtenerTotalPaginas() {
    return Math.max(1, Math.ceil(estado.productosVisibles.length / estado.productosPorPagina));
}

function obtenerProductosDePagina() {
    const inicio = (estado.paginaActual - 1) * estado.productosPorPagina;
    return estado.productosVisibles.slice(inicio, inicio + estado.productosPorPagina);
}

function renderizarBotonesPagina(totalPaginas) {
    if (!ui.paginasNumeros) return;

    const actual = estado.paginaActual;
    const secuencia = [];

    if (totalPaginas <= 7) {
        for (let i = 1; i <= totalPaginas; i += 1) secuencia.push(i);
    } else {
        let inicio = Math.max(2, actual - 1);
        let fin = Math.min(totalPaginas - 1, actual + 1);

        if (actual <= 4) {
            inicio = 2;
            fin = 5;
        }

        if (actual >= totalPaginas - 3) {
            inicio = totalPaginas - 4;
            fin = totalPaginas - 1;
        }

        secuencia.push(1);
        if (inicio > 2) secuencia.push("...");

        for (let i = inicio; i <= fin; i += 1) secuencia.push(i);

        if (fin < totalPaginas - 1) secuencia.push("...");
        secuencia.push(totalPaginas);
    }

    ui.paginasNumeros.innerHTML = secuencia.map(function(item) {
        if (item === "...") return '<span class="separador-pagina" aria-hidden="true">...</span>';
        const activa = item === actual ? "activa" : "";
        return `<button class="btn-pagina ${activa}" type="button" data-page="${item}">${item}</button>`;
    }).join("");
}

function actualizarControlesPaginacion() {
    const total = obtenerTotalPaginas();

    if (ui.paginaInfo) ui.paginaInfo.textContent = `Página ${estado.paginaActual} de ${total}`;
    if (ui.btnPrev) ui.btnPrev.disabled = estado.paginaActual === 1;
    if (ui.btnNext) ui.btnNext.disabled = estado.paginaActual === total;

    renderizarBotonesPagina(total);
}

function renderizarPaginaActual() {
    renderizarProductos(obtenerProductosDePagina());
    actualizarControlesPaginacion();
}

function actualizarListadoVisible(lista, reiniciarPagina = true) {
    estado.productosVisibles = Array.isArray(lista) ? lista : [];
    if (reiniciarPagina) estado.paginaActual = 1;

    const totalPaginas = obtenerTotalPaginas();
    if (estado.paginaActual > totalPaginas) estado.paginaActual = totalPaginas;

    renderizarPaginaActual();
}

// -------------------- Filtros --------------------

function obtenerDatosFiltros() {
    return {
        categoria: normalizarTexto(ui.selectCategoria?.value || ""),
        precioMaximo: Number.parseInt(ui.inputPrecio?.value || "", 10),
        nombre: normalizarTexto(ui.inputNombre?.value || "")
    };
}

function filtrarProductos(productos, filtros) {
    return productos.filter(function(producto) {
        const titulo = normalizarTexto(producto.title);
        const categoriaProducto = normalizarTexto(producto.category);

        const cumpleCategoria = filtros.categoria === "" || filtros.categoria === categoriaProducto;
        const cumplePrecio = Number.isNaN(filtros.precioMaximo) || producto.price <= filtros.precioMaximo;
        const cumpleNombre = filtros.nombre === "" || titulo.includes(filtros.nombre);

        return cumpleCategoria && cumplePrecio && cumpleNombre;
    });
}

function aplicarFiltros() {
    const filtros = obtenerDatosFiltros();
    const resultado = filtrarProductos(estado.productos, filtros);

    actualizarListadoVisible(resultado);

    return {
        resultados: resultado.length,
        nombreBuscado: filtros.nombre
    };
}

function limpiarFiltros() {
    if (ui.selectCategoria) ui.selectCategoria.value = "";
    if (ui.inputPrecio) ui.inputPrecio.value = "";
    if (ui.inputNombre) ui.inputNombre.value = "";
}

function ordenarPorRatingDesc(lista) {
    return [...lista].sort(function(a, b) {
        return b.rating - a.rating;
    });
}

function ordenarPorNombreAsc(lista) {
    return [...lista].sort(function(a, b) {
        return a.title.localeCompare(b.title);
    });
}

function mostrarDestacados() {
    limpiarFiltros();
    actualizarListadoVisible(estado.productos);
}

async function manejarBusqueda() {
    const resultadoBusqueda = await renderizarConSkeleton(function() {
        return aplicarFiltros();
    });

    if (!resultadoBusqueda) return;

    const { resultados, nombreBuscado } = resultadoBusqueda;
    if (nombreBuscado !== "" && resultados > 0 && ui.inputNombre) {
        ui.inputNombre.value = "";
    }
}

// -------------------- Datos API --------------------

async function obtenerJson(url) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
    return respuesta.json();
}

function renderizarCategorias(categorias) {
    if (!ui.selectCategoria) return;

    ui.selectCategoria.innerHTML = '<option value="">Categorías</option>';

    const opciones = categorias.map(function(categoria) {
        if (typeof categoria === "string") {
            return `<option value="${categoria}">${capitalizar(categoria)}</option>`;
        }
        return `<option value="${categoria.slug}">${categoria.name}</option>`;
    });

    ui.selectCategoria.innerHTML += opciones.join("");
}

async function cargarCategorias() {
    try {
        const datos = await obtenerJson(URL_CATEGORIAS);
        estado.categorias = Array.isArray(datos) ? datos : [];
        renderizarCategorias(estado.categorias);
    } catch (error) {
        console.error("No se pueden cargar las categorías", error.message);
    }
}

async function cargarProductos() {
    mostrarSkeletonCarga();

    try {
        const datos = await obtenerJson(URL_PRODUCTOS);
        const productosApi = Array.isArray(datos.products) ? datos.products : [];

        estado.productos = ordenarPorRatingDesc(productosApi);
        mostrarDestacados();
    } catch (error) {
        console.error("No se pueden cargar los datos", error.message);
        mostrarEstado("No se pudieron cargar los productos", "sin-resultados");
    }
}

// -------------------- Modal --------------------

function abrirModal(producto) {
    if (!producto || !ui.modal) return;

    if (ui.modalImagen) {
        ui.modalImagen.src = producto.thumbnail || "";
        ui.modalImagen.alt = producto.title || "";
    }

    if (ui.modalTitulo) ui.modalTitulo.textContent = producto.title;
    if (ui.modalPrecio) ui.modalPrecio.textContent = `${producto.price} €`;
    if (ui.modalDescripcion) ui.modalDescripcion.textContent = producto.description;
    if (ui.modalCategoria) ui.modalCategoria.textContent = capitalizar(producto.category);

    ui.modal.classList.remove("oculto");
}

function cerrarModal() {
    if (ui.modal) ui.modal.classList.add("oculto");
}

function obtenerProductoPorId(idProducto) {
    if (!Number.isInteger(idProducto)) return null;

    return estado.productos.find(function(producto) {
        return producto.id === idProducto;
    }) || null;
}

// -------------------- Chatbot --------------------

function abrirChat() {
    if (ui.chatBot) ui.chatBot.classList.remove("oculto");
}

function cerrarChat() {
    if (ui.chatBot) ui.chatBot.classList.add("oculto");
}

function agregarMensajeChat(remitente, mensaje, tipo = "bot") {
    if (!ui.respuesta) return;

    const clase = tipo === "user" ? "chat-user" : "chat-bot";
    const remitenteSeguro = escaparHtml(remitente);
    const mensajeSeguro = escaparHtml(mensaje);

    ui.respuesta.innerHTML += `
        <div class="chat-msg ${clase}">
            <p><strong>${remitenteSeguro}:</strong> ${mensajeSeguro}</p>
        </div>
    `;
    ui.respuesta.scrollTop = ui.respuesta.scrollHeight;
}

function obtenerCategoriasTexto() {
    return estado.categorias
        .map(function(categoria) {
            if (typeof categoria === "string") return categoria;
            return categoria?.name || categoria?.slug || "";
        })
        .filter(Boolean);
}

function obtenerProductosResumen() {
    if (estado.productos.length === 0) return null;

    return estado.productos.reduce(function(acc, producto) {
        if (!acc.masCaro || producto.price > acc.masCaro.price) acc.masCaro = producto;
        if (!acc.masBarato || producto.price < acc.masBarato.price) acc.masBarato = producto;
        if (!acc.mejorValorado || producto.rating > acc.mejorValorado.rating) acc.mejorValorado = producto;
        return acc;
    }, { masCaro: null, masBarato: null, mejorValorado: null });
}

function extraerNumeroPedido(texto) {
    const match = texto.match(/(?:pedido|orden)\s*#?\s*(\d{3,})/i);
    return match ? match[1] : null;
}

function responderCatalogo(pregunta, contexto) {
    const { totalProductos, categorias, resumenProductos } = contexto;

    if (incluyeAlguno(pregunta, ["categoria", "categoría"])) {
        if (categorias.length === 0) {
            return "Aún no tengo categorías cargadas. Inténtalo en unos segundos.";
        }
        return `Categorías disponibles (${categorias.length}): ${categorias.map(capitalizar).join(", ")}.`;
    }

    if (incluyeAlguno(pregunta, ["cuantos productos", "cuántos productos", "total productos"])) {
        return `Ahora mismo hay ${totalProductos} productos cargados.`;
    }

    if (incluyeAlguno(pregunta, ["mas caro", "más caro"])) {
        if (!resumenProductos) return "Todavía no hay productos cargados.";
        return `El producto más caro es "${resumenProductos.masCaro.title}" por ${resumenProductos.masCaro.price} €.`;
    }

    if (incluyeAlguno(pregunta, ["mas barato", "más barato"])) {
        if (!resumenProductos) return "Todavía no hay productos cargados.";
        return `El producto más barato es "${resumenProductos.masBarato.title}" por ${resumenProductos.masBarato.price} €.`;
    }

    if (incluyeAlguno(pregunta, ["mejor valorado", "mejor puntuado", "rating"])) {
        if (!resumenProductos) return "Todavía no hay productos cargados.";
        return `El mejor valorado es "${resumenProductos.mejorValorado.title}" con rating ${resumenProductos.mejorValorado.rating}.`;
    }

    if (incluyeAlguno(pregunta, ["buscar", "filtro", "filtrar"])) {
        return "Puedes filtrar por categoría, precio máximo y nombre. Usa “Buscar” para aplicar y “Todos” para limpiar.";
    }

    return null;
}

function responderEnvios(pregunta, numeroPedido) {
    if (incluyeAlguno(pregunta, ["estado de envio", "estado envio", "seguimiento", "tracking", "donde esta mi pedido", "donde esta el pedido"])) {
        if (numeroPedido) {
            return `No tengo acceso en tiempo real al pedido #${numeroPedido} desde esta demo. Si quieres, te paso con soporte humano para revisarlo.`;
        }
        return "Para revisar el envío, indícame tu número de pedido (ejemplo: Pedido #12345).";
    }

    if (incluyeAlguno(pregunta, ["cuando llega", "cuanto tarda", "tiempo de entrega"])) {
        return "El plazo habitual de entrega es de 24 a 72 horas laborables, según destino y transportista.";
    }

    if (incluyeAlguno(pregunta, ["coste de envio", "costo de envio", "gastos de envio"])) {
        return "El coste de envío se calcula al finalizar compra según dirección y método de entrega.";
    }

    if (incluyeAlguno(pregunta, ["envio internacional", "envios internacionales"])) {
        return "Sí, hay envíos internacionales en destinos seleccionados. El tiempo y coste varían por país.";
    }

    return null;
}

function responderIncidencias(pregunta) {
    if (incluyeAlguno(pregunta, ["no llega", "retraso", "pedido perdido", "incidencia"])) {
        return "Lo siento. Te recomiendo: 1) confirmar nº de pedido, 2) revisar seguimiento, 3) contactar soporte para abrir incidencia.";
    }

    if (incluyeAlguno(pregunta, ["llego roto", "llego danado", "producto defectuoso", "pedido equivocado"])) {
        return "Puedes abrir una incidencia con fotos del producto y embalaje. Soporte gestiona reemplazo o reembolso.";
    }

    if (incluyeAlguno(pregunta, ["devolucion", "devolver", "reembolso"])) {
        return "Puedes solicitar devolución dentro del plazo de política vigente. Si quieres, te indico los pasos.";
    }

    if (incluyeAlguno(pregunta, ["cancelar pedido", "anular pedido"])) {
        return "Si el pedido aún no se ha enviado, normalmente se puede cancelar. Pásame tu número de pedido para validarlo con soporte.";
    }

    return null;
}

function responderSoporte(pregunta) {
    if (incluyeAlguno(pregunta, ["hablar con un asistente", "hablar con una persona", "agente", "asesor", "humano", "soporte"])) {
        return "Claro. Para pasarte con un asistente humano, comparte: número de pedido, email de compra y resumen del problema.";
    }

    if (incluyeAlguno(pregunta, ["telefono", "correo", "contacto"])) {
        return "Contacto de soporte: soporte@dummystore.com · +34 900 000 000 (L-V 9:00 a 18:00).";
    }

    return null;
}

function generarRespuestaChat(preguntaOriginal) {
    const pregunta = normalizarTexto(preguntaOriginal);
    if (pregunta === "") return MENSAJES_CHAT.vacio;

    if (incluyeAlguno(pregunta, ["hola", "buenas"])) {
        return "¡Hola! Puedo ayudarte con productos, envíos, incidencias y contacto con soporte.";
    }

    if (incluyeAlguno(pregunta, ["ayuda", "que puedes hacer", "qué puedes hacer"])) {
        return "Puedo responder sobre categorías, productos, estado de envío, devoluciones, problemas con pedidos y cómo hablar con un asistente.";
    }

    if (pregunta.includes("gracias")) {
        return "De nada. Si quieres, te ayudo con otra consulta.";
    }

    const contexto = {
        totalProductos: estado.productos.length,
        categorias: obtenerCategoriasTexto(),
        resumenProductos: obtenerProductosResumen()
    };

    const numeroPedido = extraerNumeroPedido(preguntaOriginal);

    const respuesta =
        responderCatalogo(pregunta, contexto) ||
        responderEnvios(pregunta, numeroPedido) ||
        responderIncidencias(pregunta) ||
        responderSoporte(pregunta);

    return respuesta || MENSAJES_CHAT.fallback;
}

function manejarEnvioChat() {
    if (!ui.pregunta) return;

    const texto = ui.pregunta.value.trim();
    if (!texto) return;

    agregarMensajeChat("Tú", texto, "user");
    ui.pregunta.value = "";

    const respuesta = generarRespuestaChat(texto);
    agregarMensajeChat("Bot", respuesta, "bot");
}

function inicializarChat() {
    if (!ui.respuesta) return;
    ui.respuesta.innerHTML = "";
    agregarMensajeChat("Bot", MENSAJES_CHAT.bienvenida, "bot");
}

// -------------------- Eventos --------------------

function registrarEventosCatalogo() {
    agregarEvento(ui.contenedor, "click", function(evento) {
        const enlace = evento.target.closest("a.pintado");
        if (!enlace) return;

        if (enlace.getAttribute("href") === "#") evento.preventDefault();

        const idProducto = Number.parseInt(enlace.dataset.id, 10);
        const producto = obtenerProductoPorId(idProducto);
        if (producto) abrirModal(producto);
    });

    agregarEvento(ui.btnCerrarModal, "click", cerrarModal);

    agregarEvento(ui.modal, "click", function(evento) {
        if (evento.target === ui.modal) cerrarModal();
    });

    agregarEvento(document, "keydown", function(evento) {
        if (evento.key === "Escape") {
            cerrarModal();
            cerrarChat();
        }
    });

    agregarEvento(ui.selectCategoria, "change", function() {
        void renderizarConSkeleton(function() {
            return aplicarFiltros();
        });
    });

    agregarEvento(ui.inputPrecio, "input", function() {
        void renderizarConSkeleton(function() {
            return aplicarFiltros();
        });
    });

    agregarEvento(ui.btnBuscar, "click", function() {
        void manejarBusqueda();
    });

    agregarEvento(ui.inputNombre, "keydown", function(evento) {
        if (evento.key === "Enter") {
            void manejarBusqueda();
        }
    });

    agregarEvento(ui.btnTodos, "click", function() {
        void renderizarConSkeleton(function() {
            limpiarFiltros();
            actualizarListadoVisible(ordenarPorNombreAsc(estado.productos));
        });
    });

    agregarEvento(ui.btnPrev, "click", function() {
        if (estado.paginaActual <= 1) return;
        estado.paginaActual -= 1;
        renderizarPaginaActual();
    });

    agregarEvento(ui.btnNext, "click", function() {
        const total = obtenerTotalPaginas();
        if (estado.paginaActual >= total) return;
        estado.paginaActual += 1;
        renderizarPaginaActual();
    });

    agregarEvento(ui.paginasNumeros, "click", function(evento) {
        const boton = evento.target.closest("button[data-page]");
        if (!boton) return;

        const destino = Number(boton.dataset.page);
        if (!Number.isInteger(destino)) return;

        estado.paginaActual = destino;
        renderizarPaginaActual();
    });

    agregarEvento(ui.logo, "click", function(evento) {
        if (ui.logo?.getAttribute("href") === "#") evento.preventDefault();
        mostrarDestacados();
    });
}

function registrarEventosChat() {
    agregarEvento(ui.btnAyuda, "click", abrirChat);
    agregarEvento(ui.btnCerrarChat, "click", cerrarChat);

    agregarEvento(ui.chatBot, "click", function(evento) {
        if (evento.target === ui.chatBot) cerrarChat();
    });

    agregarEvento(ui.btnEnviar, "click", manejarEnvioChat);

    agregarEvento(ui.pregunta, "keydown", function(evento) {
        if (evento.key === "Enter" && !evento.shiftKey) {
            evento.preventDefault();
            manejarEnvioChat();
        }
    });
}

function registrarEventos() {
    registrarEventosCatalogo();
    registrarEventosChat();
}

// -------------------- Inicio --------------------

async function iniciarApp() {
    registrarEventos();
    inicializarChat();
    await Promise.all([cargarCategorias(), cargarProductos()]);
}

iniciarApp();