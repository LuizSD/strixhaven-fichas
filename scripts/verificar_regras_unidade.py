"""Executa a suíte existente e publica somente resumo seguro, sem textos do livro."""
import json
import re
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
cmd = ['npm', 'run', 'test:regras:unidade']
run = subprocess.run(cmd, cwd=root/'testes/e2e', capture_output=True, text=True)
out = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + '\n' + run.stderr)
counts = {}
for key in ['tests', 'pass', 'fail', 'skipped', 'cancelled']:
    found = re.search(r'(?:ℹ|#)\s+'+key+r'\s+(\d+)', out)
    counts[key] = int(found[1]) if found else None
missing = sorted({str(Path(p).relative_to(root)) if Path(p).is_relative_to(root) else Path(p).name for p in re.findall(r"ENOENT[^\n]*open '([^']+)'", out)})
other = sorted({m.strip() for m in re.findall(r'^\s*\w*Error(?:\s+\[[^\]]+\])?:[^\n]*', out, re.M) if 'ENOENT' not in m})
report = {'command': ' '.join(cmd), 'cwd': 'testes/e2e', 'exitCode': run.returncode, 'counts': counts, 'missingReferenceFiles': missing, 'otherErrors': other, 'status': 'passed' if run.returncode == 0 else 'blocked' if missing and not other else 'failed'}
(root/'reference/audits/unit-tests.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(run.returncode)
