'use strict';
/**
 * layout_m340.js - "M340i Sport": the Sport view (layout_sport.js: bimmer-lab's Sport theme, MIT, their shader
 * SDASH_FS) set up for a petrol M340i (G20, B58) instead of a plug-in hybrid:
 *   - the rev scale 0-8 (x 1000 rpm) with the red line at 7000 (Settings > Red zone still moves it);
 *   - the gear beside the rev bracket: D (or S) alone while the gearbox shifts itself, the gear's number alone
 *     (1-8) in manual, P, R or N otherwise;
 *   - the drive mode over the speed in its colour: ECO PRO light blue, the sport modes red, comfort white;
 *   - with the Waze map in the centre, the map's edges fade into the black (four 'fade' pieces over the map's
 *     own layer), so the window has no visible sides;
 *   - the speed unit centred under the speed;
 *   - the reading fills the whole bracket in the line's colour (over the marks, out to both lines) and runs
 *     into the bottom line, with a white bar across it at the reading (SDASH_FS u_full);
 *   - the oil bar on BMW's oil temperature scale, 70-170 °C (160 / 250 / 340 °F);
 *   - with the engine off READY stands where the rev scale's 0 is, and the 0 comes back when it runs;
 *   - the bottom bar always reads boost and the coolant (no battery readings).
 * Everything else is Sport's: the same shader, pieces and places, so what holds for Sport on the car holds here.
 */
const C = require('./layout_common');
const B = require('./bimmer');

const PAL = {
    bg: '#000000', text: '#f4f7fc', fg: '#f4f7fc', dim: '#96aacd', faint: '#606e87', sblue: '#78aaf5', spink: '#ec8c8c', sred: '#eb3c46',
    red: '#ff2a2a', regen: '#3ddc84', glow: '#3cd7ff', eco: '#7fd4ff',
    rline: '#f21f29', rband: '#540f1a', rlit: '#ed1a26', rin: '#db1421',
};
/* the rev bracket red in every drive mode, as the design; the look only changes nothing else here */
const pal = () => Object.assign({}, PAL);
const isNum = C.isNum;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* Sport's heights: its view pressed to end at the car's own strip (y 646) */
const TOP = 120, SY = (C.STRIP_Y - TOP) / (674 - TOP);
const Y = (y) => Math.round(TOP + (y - TOP) * SY);
const RPM_MAX = 8000, RPM_MARKS = 8;
const OIL_COLD = 70, OIL_HOT = 170;   // °C: BMW's oil temperature gauge (160-340 °F)
/* over Waze on cluster's map layer (its kWindowZ, 900: above every layer of a layout) */
const OVER_MAP = 950, FADE_X = 170, FADE_Y = 80;

/* the gear: the letter alone while the gearbox shifts itself (D, or S in the sport programme), the gear's number
 * alone in manual, P / R / N as they are */
function gearShort(d) {
    const g = C.gearText(d);
    return /^M\d+$/.test(g) ? g.slice(1) : /^[DS]\d+$/.test(g) ? g[0] : g;
}
/* the drive mode as the car names it (data.js FES_MODES: SPORT+, COMFORT+, ECO PRO+ ...), the + written out */
const modeName = (d) => String((d && d.driveMode) || (d && (d.mode === 'S' || d.mode === 'M') ? 'SPORT' : 'COMFORT')).replace(/\+/g, ' PLUS');
const modeColour = (t, d) => { const m = modeName(d); return /ECO/.test(m) ? t.eco : /SPORT/.test(m) ? t.sred : t.fg; };
const modeColours = (t, d) => ({ color: [modeColour(t, d), 1], glow: [modeColour(t, d), 0] });

const WINDOW = { x: 534, y: Y(130), w: 852, h: Y(130 + 460) - Y(130) };

/* the rev scale's numerals beside the bracket (Sport's view px, before Y): the scale runs from y 610 (0) to y 155
 * (the top mark); the outer line's x from the bracket's geometry (the bend at x 1740, y 317; 0.75 px per px below
 * it, 0.58 above), the numeral 41 px out on the lower leg, 35 on the upper, as Sport's are */
const RPM_AT = [];
for (let i = 0; i <= RPM_MARKS; i++) {
    const y = 610 - i * (610 - 155) / RPM_MARKS;
    const line = 1740 - (y > 317 ? 0.75 : 0.58) * Math.abs(y - 317);
    // (round the bend the line is rounded off: the numeral no further out than Sport's there)
    RPM_AT.push([Math.min(1754, Math.round(line + (y > 317 ? 41 : 35))), Math.round(y - 14)]);
}

module.exports = {
    id: 'm340',
    title: 'M340i Sport',
    font: 'wide',
    stripGear: true,
    stripFuel: false,
    ownStripGauges: true,
    mapWindow: WINDOW,
    speedGauge: false,
    dap: true,
    palette: pal,
    gearText: gearShort,
    gearShort: true,    // (D or S alone, a number alone in manual: tools/test_engine.js)

    pieces(o) {
        const strip = C.strip(o), map = o.centre === 'map', stock = o.centre === 'stock' && !strip;
        const us = o.speedUnit !== 'kmh', scale = B.SPEED_SCALE[us ? 'us' : 'metric'];
        const [redFrom, orange] = B.redMarks(o, RPM_MAX);
        const T = (key, box, font, txt, colors, align) => B.text('wide', key, box, font, txt, colors, align, Y);
        // the engine off (auto start-stop too): READY in the rev scale's 0's place
        const off = (d) => d.engineOn === false;
        const W2 = WINDOW, around = [{ x: 0, y: 0, w: 1920, h: W2.y }, { x: 0, y: W2.y + W2.h, w: 1920, h: 720 - W2.y - W2.h },
            { x: 0, y: W2.y, w: W2.x, h: W2.h }, { x: W2.x + W2.w, y: W2.y, w: 1920 - W2.x - W2.w, h: W2.h }];
        const list = map ? around.map((r, i) => C.flat('bg' + i, r.x, r.y, r.w, r.h, 'bg'))
            : stock ? [C.flat('bgL', 0, 0, 566, 720, 'bg'), C.flat('bgR', 1104, 0, 816, 720, 'bg')] : [C.flat('bg', 0, 0, 1920, 720, 'bg')];
        /* Sport's view (SDASH_FS) in its three layers, with 8 marks on the rev bracket */
        const sd = {
            u_geo: [Y(120), Y(317), Y(620), 180], u_k: [0.58 / SY, 0.75 / SY, 30], u_w: [40], u_inner: [59],
            u_scale: [Y(610), Y(155)], u_ticks: [8, RPM_MARKS], u_redFrom: [redFrom], u_orange: [orange],
            u_fuelSeg: [412, Y(440), 537, Y(607)], u_oilSeg: [1508, Y(440), 1383, Y(607)],
            u_hole: map ? [WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h] : stock ? [566, 0, 538, 720] : [0, 0, 0, 0], u_holeR: [map ? 28 : 0],
            u_strip: [425, Y(632), Math.round(42 * SY), 26], u_topEnd: [726],
            // (u_full: the reading fills the whole bracket and runs into the bottom line, a white bar across it)
            u_speed: [0], u_fuel: [0], u_oil: [0], u_stripFill: [0, 0], u_zero: [0], u_regenR: [0], u_full: [1],
        };
        const bottom = strip ? C.STRIP_Y : 646;
        const part = (key, n, x, y, w, h, extra) => Object.assign({ key, kind: 'sdash', x, y, w, h, z: -90, params: Object.assign({ u_part: [n], u_off: [x, y] }, sd),
            colors: (t) => ({ rline: t.rline, rband: t.rband, rlit: t.rlit, rin: t.rin }) }, extra);
        list.push(
            part('speedSide', 1, 0, 60, 760, bottom - 60, { dyn: (d) => ({
                u_speed: [isNum(d.speed) ? Math.round(B.scaleFrac(C.speedIn(o, d.speed), scale) * 500) / 500 : 0],
                u_fuel: [isNum(d.fuelPct) ? Math.round(clamp01(d.fuelPct / 100) * 500) / 500 : 0],
            }) }),
            // the engine speed, eased by the engine (u_value); 0 with the engine off
            part('revSide', 2, 1160, 60, 760, bottom - 60, {
                value: (d) => (!off(d) && isNum(d.rpm) ? clamp01(d.rpm / RPM_MAX) : 0), max: 1, sweep: true,
                dyn: (d) => ({
                    u_oil: [isNum(d.oil) ? Math.round(clamp01((d.oil - OIL_COLD) / (OIL_HOT - OIL_COLD)) * 500) / 500 : 0],
                }) }),
            // the bottom bar's halves as gauges: boost and the coolant
            part('bottomBar', 3, 400, Y(620) - 6, 1120, bottom - Y(620) + 6, { dyn: (d) => ({
                u_stripFill: [C.boostFrac(d), C.tempFrac(d.coolant)],
            }) }));
        // the scales' numerals: the one nearest the reading white
        const nearSpeed = (i) => (t, d) => {
            const v = isNum(d.speed) ? B.scaleFrac(C.speedIn(o, d.speed), scale) * 8 : -9;
            return { color: [Math.round(v) === i ? t.fg : t.sblue, 1], glow: [t.sblue, 0] };
        };
        const nearRpm = (i) => (t, d) => ({ color: [!off(d) && isNum(d.rpm) && Math.round(d.rpm / 1000) === i ? t.fg : t.spink, 1], glow: [t.spink, 0] });
        const SPD = [[248, 596], [206, 540], [164, 483], [122, 426], [82, 369], [51, 312], [66, 255], [96, 198], [142, 142]];
        SPD.forEach(([x, y], i) => list.push(T('spd' + i, [x, y, i === 8 ? 96 : 110, 27], 's_scale', String(scale[i]), nearSpeed(i), 'right')));
        // (full screen the 6 a little down and out, clear of the KOMBI's eDrive box, x 1770 on above y 265, as Sport's 5;
        // the 5 a little down to keep its distance)
        RPM_AT.map(([x, y], i) => (strip ? [x, y] : i === 6 ? [x + 10, y + 22] : i === 5 ? [x - 4, y + 12] : [x, y])).forEach(([x, y], i) => {
            const p = T('rpm' + i, [x, y, 40, 27], 's_scale', String(i), nearRpm(i), 'left');
            // (the 0 gives its place to READY while the engine is off)
            list.push(i === 0 ? Object.assign(p, { visible: (d) => !off(d) }) : p);
        });
        list.push(Object.assign(T('ready', [RPM_AT[0][0], RPM_AT[0][1] + 1, 120, 29], 's_unit', 'READY', B.role('fg'), 'left'), { visible: off }));
        list.push(T('mphCap', [338, 88, 80, 29], 's_unit', C.speedUnit(o), B.role('sblue'), 'center'),
            T('rpmCap', [1430, 86, 200, 29], 's_unit', '1/min x 1000', B.role('sred'), 'center'));
        // the gear with its letter (P, R, N, D4): red at the shift point
        const gearC = (t, d) => ({ color: [B.shiftNow(o, d) ? t.red : t.fg, 1], glow: [t.fg, 0] });
        if (map) {
            list.push(T('speedDigits', [285, 286, 230, 68], 's_speed', (d) => C.speedText(o, d), B.role('fg'), 'center'),
                T('speedUnit', [360, 358, 80, 29], 's_unit', C.speedUnit(o), B.role('sblue'), 'center'),
                T('gear', [1415, strip ? 230 : 182, 200, 65], 's_gear', gearShort, gearC, 'center'),
                T('driveName', [270, 248, 260, 22], 's_gl', modeName, modeColours, 'center'));
            // the map's edges faded into the background, over the map's own layer: no visible sides
            const fade = (key, x, y, w, h, dir) => ({ key, kind: 'fade', x, y, w, h, z: OVER_MAP, params: { u_dir: [dir] }, colors: (t) => ({ color: [t.bg, 1] }) });
            list.push(fade('mapFadeL', W2.x, W2.y, FADE_X, W2.h, 0), fade('mapFadeR', W2.x + W2.w - FADE_X, W2.y, FADE_X, W2.h, 1),
                fade('mapFadeT', W2.x, W2.y, W2.w, FADE_Y, 2), fade('mapFadeB', W2.x, W2.y + W2.h - FADE_Y, W2.w, FADE_Y, 3));
        } else {
            const dapOn = (d) => !!(d.dap && d.dap.acc && d.dap.acc.on);
            const acc = (d) => dapOn(d) || !!(d.cruise && d.cruise.on);
            const setOf = (d) => (dapOn(d) ? d.dap.acc.set : d.cruise ? d.cruise.set : undefined);
            const setTxt = (d) => (acc(d) && isNum(setOf(d)) ? String(Math.round(setOf(d))) : '');
            list.push(Object.assign(B.icon('accIcon', 490, Y(182), 40, 36, 'gauge', 'faint'), { colors: (t, d) => ({ color: [acc(d) ? t.regen : t.faint, 1] }) }),
                T('accSet', [538, 182, 110, 29], 's_val', setTxt, (t) => ({ color: [t.regen, 1], glow: [t.regen, 0] }), 'left'),
                T('speedDigits', [420, 313, 280, 68], 's_speed', (d) => C.speedText(o, d), B.role('fg'), 'center'),
                // (the unit centred under the speed)
                T('speedUnit', [520, 386, 80, 29], 's_unit', C.speedUnit(o), B.role('sblue'), 'center'),
                // beside the rev bracket over the car's own strip; full screen where Sport has it, left of the
                // KOMBI's own gear box (x 1410-1662), or above the right M box on an M car
                T('gear', [strip ? 1330 : 1185, strip || !C.mCar(o) ? 310 : 196, strip ? 290 : 210, 65], 's_gear', gearShort, gearC, 'center'),
                T('driveName', [420, 262, 280, 22], 's_gl', modeName, modeColours, 'center'));
            if (!stock) {
                const tl = (c) => String(Math.round(C.tempIn(o, c) / 10) * 10), tu = '°' + (o.tempUnit === 'c' ? 'C' : 'F');
                list.push(T('fuelFull', [446, 441, 40, 22], 's_gl', '1', B.role('fg'), 'center'),
                    T('fuelHalf', [504, 516, 60, 22], 's_gl', '1/2', B.role('fg'), 'center'),
                    B.icon('fuelIcon', 549, Y(551), 26, 30, 'fuel', 'dim'),
                    T('fuelEmpty', [567, 593, 30, 22], 's_gl', '0', B.role('fg'), 'center'),
                    T('oilHot', [strip ? 1405 : 1336, strip ? 441 : 446, 70, 22], 's_gl', tl(OIL_HOT), B.role('fg'), 'center'),
                    T('oilUnit', [1406, 474, 40, 29], 's_unit', tu, B.role('dim'), 'center'),
                    T('oilMid', [1343, 516, 70, 22], 's_gl', tl((OIL_COLD + OIL_HOT) / 2), B.role('fg'), 'center'),
                    B.icon('oilIcon', 1332, Y(554), 36, 24, 'oilcan', 'dim'),
                    T('oilCold', [1291, 593, 70, 22], 's_gl', tl(OIL_COLD), B.role('fg'), 'center'));
            }
        }
        // the bottom bar's halves: boost on blue, the coolant on red
        const tu = '°' + (o.tempUnit === 'c' ? 'C' : 'F');
        const halves = [{ icon: 'turbo', txt: (d) => (off(d) ? 'OFF' : isNum(d.boostActual) ? (us ? (d.boostActual * 14.5038).toFixed(1) : d.boostActual.toFixed(2)) : '--'), unit: us ? 'PSI' : 'bar' },
            { icon: 'therm', txt: (d) => (isNum(d.coolant) ? String(Math.round(C.tempIn(o, d.coolant))) : '--'), unit: tu }];
        list.push(B.icon('barIconL', 652, Y(638), 30, 30, halves[0].icon, 'fg'),
            T('barL', [690, 640, 150, 26], 's_val', halves[0].txt, B.role('fg'), 'right'),
            T('barLUnit', [846, 640, 60, 29], 's_unit', halves[0].unit, B.role('dim'), 'left'),
            B.icon('barIconR', 992, Y(638), 30, 30, halves[1].icon, 'fg'),
            T('barR', [1026, 640, 100, 26], 's_val', halves[1].txt, B.role('fg'), 'right'),
            T('barRUnit', [1132, 640, 60, 29], 's_unit', halves[1].unit, B.role('dim'), 'left'));
        if (stock) return list.filter((p) => p.kind === 'flat' || /^(speedSide|revSide)$/.test(p.key) || p.x + p.w <= 566 || p.x >= 1104);
        return list;
    },
};
