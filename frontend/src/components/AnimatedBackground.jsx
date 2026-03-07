import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas.getContext('2d');
        let W = canvas.width = window.innerWidth;
        let H = canvas.height = window.innerHeight;
        let angle = 0, raf;
        window.addEventListener('resize', () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; });

        const chakras = [
            { x: 0.78, y: 0.25, r: 140, speed: 0.003, alpha: 0.045 },
            { x: 0.08, y: 0.72, r: 80, speed: -0.005, alpha: 0.030 },
            { x: 0.52, y: 0.88, r: 55, speed: 0.008, alpha: 0.022 }
        ];
        const orbs = Array.from({ length: 6 }, (_, i) => ({
            x: Math.random() * W, y: Math.random() * H, r: 80 + Math.random() * 120,
            dx: (Math.random() - .5) * .3, dy: (Math.random() - .5) * .3,
            isOrange: i % 2 === 0, op: 0.03 + Math.random() * 0.04
        }));
        const particles = Array.from({ length: 22 }, () => ({
            x: Math.random() * W, y: H + Math.random() * H,
            r: 2 + Math.random() * 3, speed: .4 + Math.random() * .7,
            isOrange: Math.random() > .5, op: .12 + Math.random() * .2, a: Math.random() * Math.PI * 2, as: (Math.random() - .5) * .01
        }));

        function drawChakra(cx, cy, r, rot, alpha) {
            ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = '#FF9933'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, r * .74, 0, Math.PI * 2); ctx.strokeStyle = '#138808'; ctx.lineWidth = .8; ctx.stroke();
            for (let i = 0; i < 24; i++) {
                const a = (i / 24) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .14, Math.sin(a) * r * .14); ctx.lineTo(Math.cos(a) * r * .71, Math.sin(a) * r * .71);
                ctx.strokeStyle = i % 3 === 0 ? '#FF9933' : '#138808'; ctx.lineWidth = i % 6 === 0 ? 1.1 : .55; ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(0, 0, r * .07, 0, Math.PI * 2); ctx.fillStyle = '#FF9933'; ctx.fill();
            ctx.restore();
        }

        function frame() {
            ctx.clearRect(0, 0, W, H);
            orbs.forEach(o => {
                const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
                const col = o.isOrange ? `rgba(255,153,51,` : `rgba(19,136,8,`;
                g.addColorStop(0, col + o.op + ')'); g.addColorStop(1, col + '0)');
                ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
                o.x += o.dx; o.y += o.dy;
                if (o.x < -o.r) o.x = W + o.r; if (o.x > W + o.r) o.x = -o.r;
                if (o.y < -o.r) o.y = H + o.r; if (o.y > H + o.r) o.y = -o.r;
            });
            chakras.forEach(c => drawChakra(c.x * W, c.y * H, c.r, angle * c.speed / Math.abs(c.speed) * (angle * Math.abs(c.speed)), c.alpha));
            angle += 0.004;
            particles.forEach(p => {
                ctx.save(); ctx.globalAlpha = p.op; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.isOrange ? '#FF9933' : '#138808'; ctx.fill(); ctx.restore();
                p.y -= p.speed; p.a += p.as; p.x += Math.sin(p.a) * .5;
                if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
            });
            raf = requestAnimationFrame(frame);
        }
        frame();
        return () => { cancelAnimationFrame(raf); };
    }, []);
    return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', width: '100%', height: '100%' }} />;
}
