const URL_PRODUCTOS = "https://dummyjson.com/products?limit=0";
const URL_CATEGORIAS = "https://dummyjson.com/products/categories";
const RETRASO_SKELETON_MS = 140;

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
    chatBot: document.querySelector ("#chatbot"),
    btnCerrarChat: document.querySelector("#btnCerrarChat"),
    respuesta: document.querySelector(".respuesta"),
    pregunta: document.querySelector("#pregunta"),
    btnEnviar: document.querySelector("#btnEnviar")

    };

let tokenRenderSkeleton = 0;

// Normaliza texto para buscar sin problemas de mayusculas, tildes o espacios.
function normalizarTexto(texto = "") {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Pone la primera letra en mayuscula.
function capitalizar(texto = "") {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Muestra mensajes como "Cargando" o "Sin resultados".
function mostrarEstado(mensaje, clase) {
    ui.contenedor.innerHTML = `<p class="${clase}">${mensaje}</p>`;
}

// Muestra tarjetas skeleton mientras llegan los datos de la API.
function mostrarSkeletonCarga(cantidad = estado.productosPorPagina) {
    const total = Math.max(4, cantidad);
    const tarjetas = [];

    for (let indice = 0; indice < total; indice += 1) {
        tarjetas.push(`
            <article class="pintado skeleton-card" aria-hidden="true">
                <div class="skeleton-line skeleton-titulo"></div>
                <div class="skeleton-img"></div>
                <div class="skeleton-line skeleton-precio"></div>
                <div class="skeleton-line skeleton-categoria"></div>
            </article>
        `);
    }

    ui.contenedor.innerHTML = tarjetas.join("");
    ui.paginacion.style.display = "none";
}

function esperar(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

async function renderizarConSkeleton(callback, cantidadSkeleton = estado.productosPorPagina) {
    const tokenActual = tokenRenderSkeleton + 1;
    tokenRenderSkeleton = tokenActual;

    mostrarSkeletonCarga(cantidadSkeleton);
    await esperar(RETRASO_SKELETON_MS);

    if (tokenActual !== tokenRenderSkeleton) {
        return null;
    }

    return callback();
}

// Crea el HTML de cada tarjeta de producto.
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

// Pinta productos y muestra/oculta paginacion segun haya datos.
function renderizarProductos(lista) {
    if (!Array.isArray(lista) || lista.length === 0) {
        mostrarEstado("No hay resultados de búsqueda", "sin-resultados");
        ui.paginacion.style.display = "none";
        return;
    }

    ui.contenedor.innerHTML = lista.map(crearTarjetaProducto).join("");
    ui.paginacion.style.display = "flex";
}

// Calcula cuantas paginas hay en total.
function obtenerTotalPaginas() {
    return Math.max(1, Math.ceil(estado.productosVisibles.length / estado.productosPorPagina));
}

// Devuelve solo los productos de la pagina actual.
function obtenerProductosDePagina() {
    const inicio = (estado.paginaActual - 1) * estado.productosPorPagina;
    const fin = inicio + estado.productosPorPagina;
    return estado.productosVisibles.slice(inicio, fin);
}

// Actualiza texto y botones de la barra de paginacion.
function actualizarControlesPaginacion() {
    const totalPaginas = obtenerTotalPaginas();

    ui.paginaInfo.textContent = `Página ${estado.paginaActual} de ${totalPaginas}`;
    ui.btnPrev.disabled = estado.paginaActual === 1;
    ui.btnNext.disabled = estado.paginaActual === totalPaginas;
    renderizarBotonesPagina(totalPaginas);
}

// Dibuja los botones numericos (1, 2, 3...).
function renderizarBotonesPagina(totalPaginas) {
    const paginaActual = estado.paginaActual;
    const secuencia = [];
    const botones = [];

    if (totalPaginas <= 7) {
        for (let numeroPagina = 1; numeroPagina <= totalPaginas; numeroPagina += 1) {
            secuencia.push(numeroPagina);
        }
    } else {
        let inicio = Math.max(2, paginaActual - 1);
        let fin = Math.min(totalPaginas - 1, paginaActual + 1);

        if (paginaActual <= 4) {
            inicio = 2;
            fin = 5;
        }

        if (paginaActual >= totalPaginas - 3) {
            inicio = totalPaginas - 4;
            fin = totalPaginas - 1;
        }

        secuencia.push(1);

        if (inicio > 2) {
            secuencia.push("...");
        }

        for (let numeroPagina = inicio; numeroPagina <= fin; numeroPagina += 1) {
            secuencia.push(numeroPagina);
        }

        if (fin < totalPaginas - 1) {
            secuencia.push("...");
        }

        secuencia.push(totalPaginas);
    }

    secuencia.forEach(function(item) {
        if (item === "...") {
            botones.push('<span class="separador-pagina" aria-hidden="true">...</span>');
            return;
        }

        const claseActiva = item === paginaActual ? "activa" : "";

        botones.push(
            `<button class="btn-pagina ${claseActiva}" type="button" data-page="${item}">${item}</button>`
        );
    });

    ui.paginasNumeros.innerHTML = botones.join("");
}

// Render completo de la pagina actual.
function renderizarPaginaActual() {
    renderizarProductos(obtenerProductosDePagina());
    actualizarControlesPaginacion();
}

// Cambia el listado visible y reinicia pagina cuando hace falta.
function actualizarListadoVisible(lista, reiniciarPagina = true) {
    estado.productosVisibles = Array.isArray(lista) ? lista : [];

    if (reiniciarPagina) {
        estado.paginaActual = 1;
    }

    const totalPaginas = obtenerTotalPaginas();
    if (estado.paginaActual > totalPaginas) {
        estado.paginaActual = totalPaginas;
    }

    renderizarPaginaActual();
}

// Lee los valores actuales del formulario de filtros.
function obtenerDatosFiltros() {
    return {
        categoria: normalizarTexto(ui.selectCategoria.value),
        precioMaximo: parseInt(ui.inputPrecio.value, 10),
        nombre: normalizarTexto(ui.inputNombre.value)
    };
}

// Filtra productos por categoria, precio maximo y nombre.
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

// Aplica filtros y actualiza la rejilla paginada.
function aplicarFiltros() {
    const filtros = obtenerDatosFiltros();
    const resultado = filtrarProductos(estado.productos, filtros);

    actualizarListadoVisible(resultado);

    return {
        resultados: resultado.length,
        nombreBuscado: filtros.nombre
    };
}

// Limpia todos los campos de filtros.
function limpiarFiltros() {
    ui.selectCategoria.value = "";
    ui.inputPrecio.value = "";
    ui.inputNombre.value = "";
}

// Ordena por mejor valoracion (descendente).
function ordenarPorRatingDesc(lista) {
    return [...lista].sort(function(a, b) {
        return b.rating - a.rating;
    });
}

// Ordena alfabeticamente por nombre.
function ordenarPorNombreAsc(lista) {
    return [...lista].sort(function(a, b) {
        return a.title.localeCompare(b.title);
    });
}

// Vuelve a la vista principal (destacados con paginacion).
function mostrarDestacados() {
    limpiarFiltros();
    actualizarListadoVisible(estado.productos);
}

// Wrapper de fetch con control de errores HTTP.
async function obtenerJson(url) {
    const respuesta = await fetch(url);

    if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status}`);
    }

    return respuesta.json();
}

// Carga categorias de la API y las pinta en el select.
async function cargarCategorias() {
    try {
        const datos = await obtenerJson(URL_CATEGORIAS);
        estado.categorias = Array.isArray(datos) ? datos : [];
        renderizarCategorias(estado.categorias);
    } catch (error) {
        console.error("No se pueden cargar las categorías", error.message);
    }
}

// Rellena el select de categorias.
function renderizarCategorias(categorias) {
    ui.selectCategoria.innerHTML = '<option value="">Categorías</option>';

    const opciones = categorias.map(function(categoria) {
        if (typeof categoria === "string") {
            return `<option value="${categoria}">${capitalizar(categoria)}</option>`;
        }

        return `<option value="${categoria.slug}">${categoria.name}</option>`;
    });

    ui.selectCategoria.innerHTML += opciones.join("");
}

// Carga productos desde API y prepara la vista inicial.
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

// Ejecuta la busqueda y limpia el input de nombre si hay resultados.
async function manejarBusqueda() {
    const resultadoBusqueda = await renderizarConSkeleton(function() {
        return aplicarFiltros();
    });

    if (!resultadoBusqueda) {
        return;
    }

    const { resultados, nombreBuscado } = resultadoBusqueda;

    if (nombreBuscado !== "" && resultados > 0) {
        ui.inputNombre.value = "";
    }
}
function abrirModal(producto) {
    if (!producto) {
        return;
    }

    ui.modalImagen.src = producto.thumbnail || "";
    ui.modalImagen.alt = producto.title || "";
    ui.modalTitulo.textContent = producto.title;
    ui.modalPrecio.textContent = `${producto.price} €`;
    ui.modalDescripcion.textContent = producto.description;
    ui.modalCategoria.textContent = capitalizar(producto.category);

    ui.modal.classList.remove("oculto");
}

function cerrarModal() {
    ui.modal.classList.add("oculto");
}

function cerrarChat () {
    ui.chatBot.classList.add ("oculto");
}

function abrirChat() {
    ui.chatBot.classList.remove ("oculto");
}
ui.btnAyuda.addEventListener("click", abrirChat);
ui.btnCerrarChat.addEventListener ("click", cerrarChat);
ui.btnCerrarModal.addEventListener("click", cerrarModal);

ui.modal.addEventListener("click", function(evento) {
    if (evento.target === ui.modal) {
        cerrarModal();
    }
});

function obtenerProductoPorId(idProducto) {
    if (!Number.isInteger(idProducto)) {
        return null;
    }

    return estado.productos.find(function(producto) {
        return producto.id === idProducto;
    }) || null;
}

// Registra todos los eventos de UI.
function registrarEventos() {
    ui.contenedor.addEventListener("click", function(evento) {
        const enlace = evento.target.closest("a.pintado");

        if (enlace && enlace.getAttribute("href") === "#") {
            evento.preventDefault();
        }

        if (!enlace) {
            return;
        }

        const idProducto = Number.parseInt(enlace.dataset.id, 10);
        const producto = obtenerProductoPorId(idProducto);

        if (producto) {
            abrirModal(producto);
        }
    });

    ui.btnCerrarModal.addEventListener("click", cerrarModal);

    ui.modal.addEventListener("click", function(evento) {
        if (evento.target === ui.modal) {
            cerrarModal();
        }
    });

    document.addEventListener("keydown", function(evento) {
        if (evento.key === "Escape") {
            cerrarModal();
        }
    });

    ui.selectCategoria.addEventListener("change", function() {
        void renderizarConSkeleton(function() {
            return aplicarFiltros();
        });
    });

    ui.inputPrecio.addEventListener("input", function() {
        void renderizarConSkeleton(function() {
            return aplicarFiltros();
        });
    });

    ui.btnBuscar.addEventListener("click", function() {
        void manejarBusqueda();
    });

    ui.inputNombre.addEventListener("keydown", function(evento) {
        if (evento.key === "Enter") {
            void manejarBusqueda();
        }
    });

    ui.btnTodos.addEventListener("click", function() {
        void renderizarConSkeleton(function() {
            limpiarFiltros();
            actualizarListadoVisible(ordenarPorNombreAsc(estado.productos));
        });
    });

    ui.btnPrev.addEventListener("click", function() {
        if (estado.paginaActual > 1) {
            estado.paginaActual -= 1;
            renderizarPaginaActual();
        }
    });

    ui.btnNext.addEventListener("click", function() {
        const totalPaginas = obtenerTotalPaginas();

        if (estado.paginaActual < totalPaginas) {
            estado.paginaActual += 1;
            renderizarPaginaActual();
        }
    });

    ui.paginasNumeros.addEventListener("click", function(evento) {
        const botonPagina = evento.target.closest("button[data-page]");

        if (!botonPagina) {
            return;
        }

        const paginaDestino = Number(botonPagina.dataset.page);

        if (!Number.isInteger(paginaDestino)) {
            return;
        }

        estado.paginaActual = paginaDestino;
        renderizarPaginaActual();
    });

    ui.logo.addEventListener("click", function(evento) {
        if (ui.logo.getAttribute("href") === "#") {
            evento.preventDefault();
        }

        mostrarDestacados();
    });
}

// Punto de entrada de la app.
async function iniciarApp() {
    registrarEventos();
    await Promise.all([cargarCategorias(), cargarProductos()]);
}

iniciarApp();