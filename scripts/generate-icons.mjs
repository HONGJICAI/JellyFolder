import { execSync } from 'node:child_process';

const sizes = [
	['icon-192.png', 192],
	['icon-512.png', 512],
	['apple-touch-icon.png', 180],
];

for (const [name, size] of sizes) {
	execSync(
		`npx -y sharp-cli -i static/icon.svg -o static/${name} resize ${size} ${size}`,
		{ stdio: 'inherit' },
	);
	console.log(`wrote static/${name}`);
}
