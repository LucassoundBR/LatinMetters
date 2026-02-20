// js/i18n.js

export const i18nData = {
    en: {
        amp: "AMP", depth: "DEPTH", speed: "SPEED", palette: "PALETTE",
        mode: "MODE", view: "VIEW", rotation: "ROTATION",
        size_full: "SIZE: FULL", size_half: "SIZE: HALF",
        grid_on: "GRID: ON", grid_off: "GRID: OFF", click_hint: "CLICK TO ENABLE AUDIO",
        rot_off: "ROT: OFF", rot_slow: "ROT: SLOW", rot_fast: "ROT: FAST",
        src_mic: "SOURCE: MIC", src_sys: "SOURCE: SYSTEM",
        sc_hide: "HIDE UI", sc_pause: "PAUSE",
        sys_audio_hint: "Check 'Share Audio' in the popup!",

        mode_solid: "SOLID", mode_wire: "WIRE", mode_lines: "LINES", mode_dots: "DOTS", mode_bars: "BARS",
        view_iso: "ISO", view_front: "FRONT", view_side: "SIDE", view_top: "TOP",
        pal_dreamy: "Dreamy", pal_ocean: "Midnight Sea", pal_plasma: "Plasma", pal_heat: "Heat",
        pal_amazonia: "Amazonia", pal_jinx: "Jinx", pal_spectral: "Nebula", pal_golden: "Luxury",
        pal_kawaii: "Kawaii", pal_metal_gear: "Metal Gear"
    },
    pt: {
        amp: "AMP", depth: "PROFUNDIDADE", speed: "VELOCIDADE", palette: "PALETA",
        mode: "MODO", view: "VISTA", rotation: "ROTAÇÃO",
        size_full: "TAMANHO: CHEIO", size_half: "TAMANHO: METADE",
        grid_on: "GRADE: ON", grid_off: "GRADE: OFF", click_hint: "CLIQUE PARA ATIVAR ÁUDIO",
        rot_off: "ROT: OFF", rot_slow: "ROT: LENTA", rot_fast: "ROT: RÁPIDA",
        src_mic: "FONTE: MIC", src_sys: "FONTE: SISTEMA",
        sc_hide: "OCULTAR UI", sc_pause: "PAUSAR",
        sys_audio_hint: "Marque 'Compartilhar Áudio' na janela!",

        mode_solid: "SÓLIDO", mode_wire: "ARAME", mode_lines: "LINHAS", mode_dots: "PONTOS", mode_bars: "BARRAS",
        view_iso: "ISO", view_front: "FRENTE", view_side: "LADO", view_top: "TOPO",
        pal_dreamy: "Sonho", pal_ocean: "Mar da Meia-noite", pal_plasma: "Plasma", pal_heat: "Calor",
        pal_amazonia: "Amazônia", pal_jinx: "Jinx", pal_spectral: "Nebulosa", pal_golden: "Luxo",
        pal_kawaii: "Kawaii", pal_metal_gear: "Metal Gear"
    },
    es: {
        amp: "AMP", depth: "PROFUNDIDAD", speed: "VELOCIDAD", palette: "PALETA",
        mode: "MODO", view: "VISTA", rotation: "ROTACIÓN",
        size_full: "TAMAÑO: COMP.", size_half: "TAMAÑO: MITAD",
        grid_on: "REJILLA: ON", grid_off: "REJILLA: OFF", click_hint: "CLIC PARA ACTIVAR AUDIO",
        rot_off: "ROT: OFF", rot_slow: "ROT: LENTA", rot_fast: "ROT: RÁPIDA",
        src_mic: "FUENTE: MIC", src_sys: "FUENTE: SISTEMA",
        sc_hide: "OCULTAR UI", sc_pause: "PAUSAR",
        sys_audio_hint: "¡Marca 'Compartir Audio' en la ventana!",

        mode_solid: "SÓLIDO", mode_wire: "ALAMBRE", mode_lines: "LÍNEAS", mode_dots: "PUNTOS", mode_bars: "BARRAS",
        view_iso: "ISO", view_front: "FRENTE", view_side: "LADO", view_top: "ARRIBA",
        pal_dreamy: "Ensueño", pal_ocean: "Mar de Medianoche", pal_plasma: "Plasma", pal_heat: "Calor",
        pal_amazonia: "Amazonia", pal_jinx: "Jinx", pal_spectral: "Nebulosa", pal_golden: "Lujo",
        pal_kawaii: "Kawaii", pal_metal_gear: "Metal Gear"
    }
};

export class I18nManager {
    constructor(stateConfig, sceneConfig) {
        this.currentLang = 'en';
        this.config = stateConfig;
        this.sceneConfig = sceneConfig;
    }

    setLang(lang) {
        this.currentLang = lang;

        // Update language buttons visually
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = Array.from(document.querySelectorAll('.lang-btn')).find(btn => btn.innerText.toLowerCase() === lang);
        if (activeBtn) activeBtn.classList.add('active');

        // Update basic string elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key.includes('size')) el.innerText = this.config.halfDepth ? i18nData[lang].size_half : i18nData[lang].size_full;
            else if (key.includes('grid')) el.innerText = this.sceneConfig.gridVisible ? i18nData[lang].grid_on : i18nData[lang].grid_off;
            else if (key === 'rot_off') el.innerText = i18nData[lang][['rot_off', 'rot_slow', 'rot_fast'][this.sceneConfig.rotState]];
            else if (key === 'src_mic') el.innerText = this.sceneConfig.audioSource === 'mic' ? i18nData[lang].src_mic : i18nData[lang].src_sys;
            else el.innerText = i18nData[lang][key];
        });

        const hint = document.getElementById('click-hint');
        if (hint) hint.innerText = i18nData[lang].click_hint;

        // Update dropdowns
        this.translateOptions('modeSelect', 'mode_', lang);
        this.translateOptions('viewSelect', 'view_', lang);
        this.translateOptions('paletteSelect', 'pal_', lang);
    }

    translateOptions(id, prefix, lang) {
        const select = document.getElementById(id);
        if (!select) return;
        Array.from(select.options).forEach(opt => {
            const key = prefix + opt.value;
            if (i18nData[lang][key]) opt.innerText = i18nData[lang][key];
        });
    }
}
