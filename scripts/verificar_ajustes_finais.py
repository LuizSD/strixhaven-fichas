"""Executa suítes existentes, guardando logs privados e apenas resumo público seguro."""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('suite', choices=['unidade','regras','regras-reexecucao','strixhaven','magias','offline','novos','artificer'])
args = parser.parse_args()
configs = {'regras':'regras/playwright.config.mjs','regras-reexecucao':'regras/playwright.config.mjs','strixhaven':'strixhaven.config.mjs','magias':'magias.config.mjs','offline':'playwright.config.mjs','novos':'ajustes-finais.config.mjs','artificer':'artificer.config.mjs'}
cmd = ['node','--test','../regras/unidade/*.test.mjs'] if args.suite == 'unidade' else ['node','node_modules/@playwright/test/cli.js','test','--config='+configs[args.suite],'--reporter=json']
if args.suite == 'regras-reexecucao': cmd += ['itens-seletor-ficha.spec.mjs','magias-customizadas.spec.mjs','--grep','preserva as 5|OUTRO círculo|nome E círculo']
env = os.environ.copy()
lib = '/tmp/opencode/browser-libs/usr/lib/x86_64-linux-gnu'
if Path(lib).exists(): env['LD_LIBRARY_PATH'] = lib + (':'+env['LD_LIBRARY_PATH'] if env.get('LD_LIBRARY_PATH') else '')
run = subprocess.run(cmd,cwd=ROOT/'testes/e2e',capture_output=True,text=True,env=env)
saida = ROOT/'assets-private/entrega/ajustes-finais-tests'; saida.mkdir(parents=True,exist_ok=True)
(saida/(args.suite+'.log')).write_text(run.stdout+'\n'+run.stderr)
report = {'command':' '.join(cmd),'cwd':'testes/e2e','exitCode':run.returncode}
if args.suite == 'unidade':
    out = run.stdout+'\n'+run.stderr
    report['counts']={k:int(m[1]) if (m:=re.search(r'(?:ℹ|#)\s+'+k+r'\s+(\d+)',out)) else None for k in ['tests','pass','fail','skipped']}
    report['failures']=list(dict.fromkeys(s for s in out.splitlines() if s.startswith('✖') and 'failing tests' not in s))
    report['missingReferences']=sorted({str(Path(p).relative_to(ROOT)) for p in re.findall(r"ENOENT[^\n]*open '([^']+)'",out)})
else:
    try:
        result=json.loads(run.stdout)
        report['stats']=result.get('stats',{})
        report['failures']=[]
        def visitar(suites):
            for s in suites:
                for spec in s.get('specs',[]):
                    if not spec.get('ok',True):
                        report['failures'].append({'file':spec.get('file'),'title':spec.get('title'),'errors':[r.get('error',{}).get('message','').split('\n')[0][:240] for t in spec.get('tests',[]) for r in t.get('results',[]) if r.get('status') in ['failed','timedOut']]})
                visitar(s.get('suites',[]))
        visitar(result.get('suites',[]))
    except ValueError:
        report['error']='Saída sem JSON; consulte o log privado.'
dest=ROOT/'docs/verificacoes-ajustes-finais'; dest.mkdir(parents=True,exist_ok=True)
(dest/(args.suite+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(run.returncode)
