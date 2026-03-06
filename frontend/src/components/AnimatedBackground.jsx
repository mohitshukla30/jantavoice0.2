import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animId;
        let W = window.innerWidth;
        let H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;

        window.addEventListener('resize', () => {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        });

        // ── ASHOKA CHAKRA (main large background) ──
        let chakraAngle = 0;

        // ── FLOATING ORBS ──
        const orbs = Array.from({ length: 6 }, (_, i) => ({
            x: Math.random() * W,
            y: Math.random() * H,
            r: 80 + Math.random() * 120,
            dx: (Math.random() - 0.5) * 0.3,
            dy: (Math.random() - 0.5) * 0.3,
            color: i % 2 === 0 ? 'rgba(255,153,51,' : 'rgba(19,136,8,',
            opacity: 0.03 + Math.random() * 0.04,
        }));

        // ── PARTICLES ──
        const particles = Array.from({ length: 25 }, () => ({
            x: Math.random() * W,
            y: H + Math.random() * H,
            r: 2 + Math.random() * 4,
            speed: 0.4 + Math.random() * 0.8,
            color: Math.random() > 0.5 ? '#FF9933' : '#138808',
            opacity: 0.15 + Math.random() * 0.25,
            angle: Math.random() * Math.PI * 2,
            angleSpeed: (Math.random() - 0.5) * 0.01,
        }));

        function drawChakra(cx, cy, radius, angle, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(cx, cy);
            ctx.rotate(angle);

            // Outer ring
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF9933';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Inner ring
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.75, 0, Math.PI * 2);
            ctx.strokeStyle = '#138808';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 24 spokes
            for (let i = 0; i < 24; i++) {
                const a = (i / 24) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * radius * 0.15, Math.sin(a) * radius * 0.15);
                ctx.lineTo(Math.cos(a) * radius * 0.72, Math.sin(a) * radius * 0.72);
                ctx.strokeStyle = i % 3 === 0 ? '#FF9933' : '#138808';
                ctx.lineWidth = i % 6 === 0 ? 1.2 : 0.6;
                ctx.stroke();
            }

            // Hub dot
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
            ctx.fillStyle = '#FF9933';
            ctx.fill();

            ctx.restore();
        }

        function animate() {
            ctx.clearRect(0, 0, W, H);

            // Draw floating orbs
            orbs.forEach(orb => {
                const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
                grad.addColorStop(0, orb.color + orb.opacity + ')');
                grad.addColorStop(1, orb.color + '0)');
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                orb.x += orb.dx;
                orb.y += orb.dy;
                if (orb.x < -orb.r) orb.x = W + orb.r;
                if (orb.x > W + orb.r) orb.x = -orb.r;
                if (orb.y < -orb.r) orb.y = H + orb.r;
                if (orb.y > H + orb.r) orb.y = -orb.r;
            });

            // Large background Ashoka Chakra (center)
            drawChakra(W * 0.75, H * 0.3, 160, chakraAngle * 0.3, 0.045);
            // Second smaller one
            drawChakra(W * 0.1, H * 0.7, 90, -chakraAngle * 0.5, 0.03);
            // Third tiny one
            drawChakra(W * 0.5, H * 0.9, 60, chakraAngle * 0.8, 0.025);

            chakraAngle += 0.004;

            // Draw particles
            particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                ctx.restore();

                p.y -= p.speed;
                p.angle += p.angleSpeed;
                p.x += Math.sin(p.angle) * 0.5;
                if (p.y < -20) {
                    p.y = H + 20;
                    p.x = Math.random() * W;
                }
            });

            animId = requestAnimationFrame(animate);
        }

        animate();
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed', inset: 0, zIndex: 0,
                pointerEvents: 'none', width: '100%', height: '100%'
            }}
        />
    );
}
