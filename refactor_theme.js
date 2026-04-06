const fs = require('fs');
const path = require('path');

const files = [
    'app/_layout.tsx',
    'app/sign-up.tsx',
    'app/sign-in.tsx',
    'app/pending.tsx',
    'app/settings/school-config.tsx',
    'app/(teacher)/_layout.tsx',
    'app/(teacher)/letters.tsx',
    'app/(teacher)/index.tsx',
    'app/(teacher)/attendance.tsx',
    'app/(student)/_layout.tsx',
    'app/(student)/map.tsx',
    'app/(student)/index.tsx',
    'app/(parent)/_layout.tsx',
    'app/(parent)/map.tsx',
    'app/(parent)/index.tsx',
    'app/(parent)/child-status.tsx',
    'app/(admin)/_layout.tsx',
    'app/(admin)/teachers.tsx',
    'app/(admin)/index.tsx',
    'app/(admin)/users.tsx'
];

files.forEach(file => {
    let absPath = path.join(__dirname, file);
    if (!fs.existsSync(absPath)) return;

    let content = fs.readFileSync(absPath, 'utf-8');

    // 1. Calculate relative paths
    const depth = file.split('/').length - 1;
    const relPre = '../'.repeat(depth) || './';

    // 2. Ensure imports
    if (!content.includes('useAppTheme')) {
        content = content.replace(
            /import\s+{\s*Colors\s*}\s+from\s+['"].*?Colors['"];/,
            `import { useAppTheme } from '${relPre}hooks/useAppTheme';\nimport { ColorTheme } from '${relPre}constants/Colors';`
        );
    }

    // 3. Ensure hook usage in component
    if (!content.includes('const styles = getStyles(theme);')) {
        content = content.replace(
            /(export\s+default\s+function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*{)/,
            `$1\n    const theme = useAppTheme();\n    const styles = getStyles(theme);`
        );
    }

    // 4. Ensure getStyles is a hoisted function
    if (content.includes('const styles = StyleSheet.create(')) {
        content = content.replace(
            /const\s+styles\s*=\s*StyleSheet\.create\(/,
            `function getStyles(theme: ColorTheme) {\n    return StyleSheet.create(`
        );
        content = content.replace(/\s*}\);(\s*)$/, '\n    });\n}$1');
    } else if (content.includes('const getStyles = (theme: ColorTheme) => StyleSheet.create(')) {
        content = content.replace(
            /const\s+getStyles\s*=\s*\(theme:\s*ColorTheme\)\s*=>\s*StyleSheet\.create\(/,
            `function getStyles(theme: ColorTheme) {\n    return StyleSheet.create(`
        );
        // Assuming it ends with }); we need to add }
        content = content.replace(/\s*}\);(\s*)$/, '\n    });\n}$1');
    }

    // 5. Replace Colors. to theme.
    content = content.replace(/Colors\./g, 'theme.');

    fs.writeFileSync(absPath, content, 'utf-8');
});

console.log('Refactoring complete.');
