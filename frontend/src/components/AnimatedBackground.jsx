import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
    const ref = useRef(null);

    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas.getContext('2d');
        let raf;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Apple-inspired soft gradient orbs (Blue, Light Blue, Muted Purple)
        const orbs = [
            { x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: 400, color: 'rgba(0, 113, 227, 0.05)', vx: 0.2, vy: 0.15 },
            { x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: 600, color: 'rgba(41, 151, 255, 0.03)', vx: -0.15, vy: 0.2 },
            { x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: 500, color: 'rgba(120, 120, 128, 0.03)', vx: 0.1, vy: -0.1 },
        ];

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            orbs.forEach(orb => {
                orb.x += orb.vx;
                orb.y += orb.vy;

                if (orb.x < -orb.r) orb.vx *= -1;
                if (orb.x > canvas.width + orb.r) orb.vx *= -1;
                if (orb.y < -orb.r) orb.vy *= -1;
                if (orb.y > canvas.height + orb.r) orb.vy *= -1;

                const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
                g.addColorStop(0, orb.color);
                g.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.beginPath();
                ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
                ctx.fillStyle = g;
                ctx.fill();
            });

            raf = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <canvas
            ref={ref}
            className="fixed inset-0 w-full h-full pointer-events-none -z-10"
            style={{ filter: 'blur(40px)' }}
        />
    );
}
