const fs = require('fs');
const p = 'C:/project/app_clone/auto_income/test/warehouse_server.py';
let code = fs.readFileSync(p, 'utf8');

const targetStr = 'def save_warehouse_to_all_targets(wh_data):';
const genFunc = `def generate_centerlines_js(wh_data):
    meta = wh_data.get('meta', {})
    version = meta.get('calibrationVersion', '4.1-user-curated-lock')
    parts_obj = wh_data.get('parts', wh_data)
    centerlines_data = {
        'version': version,
        'updatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'parts': {}
    }
    for pid, p in parts_obj.items():
        box = p.get('box', {})
        box_arr = [box.get('x', 0), box.get('y', 0), box.get('w', 1024), box.get('h', 1024)] if isinstance(box, dict) else [0, 0, 1024, 1024]
        stroke_widths = p.get('strokeWidths') or ([p.get('strokeWidth', 34)])
        centerlines_data['parts'][pid] = {
            'c': p.get('char', ''),
            'r': p.get('role', ''),
            't': p.get('formType', p.get('typeIdx', 1)),
            'b': box_arr,
            'm': p.get('medians', []),
            'w': stroke_widths
        }
    cl_json = json.dumps(centerlines_data, ensure_ascii=False, indent=2)
    return f"""/**
 * Hangul Gungsuh 153 Parts Centerlines and Stroke Widths Database
 * Version: {version}
 * Updated: {centerlines_data['updatedAt']}
 */
(function (global) {{
  'use strict';
  global.HANGUL_WH_CENTERLINES = {cl_json};
  if (typeof module !== 'undefined' && module.exports) {{
    module.exports = global.HANGUL_WH_CENTERLINES;
  }}
}})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
"""

`;

if (code.includes('generate_centerlines_js')) {
  console.log('Already updated');
} else {
  code = code.replace(targetStr, genFunc + targetStr);
  const retTarget = '        return saved_list';
  const clSave = `        # warehouse_centerlines.js 및 최신 백업 자동 갱신
        try:
            cl_content = generate_centerlines_js(wh_data)
            cl_targets = [
                r'C:\\project\\한글획순\\warehouse_centerlines.js',
                os.path.join(ROOT_DIR, 'warehouse_centerlines.js'),
                os.path.join(BASE_DIR, 'warehouse_centerlines.js')
            ]
            for cl_p in cl_targets:
                try:
                    with open(cl_p, 'w', encoding='utf-8') as f:
                        f.write(cl_content)
                    saved_list.append(cl_p)
                except Exception:
                    pass
            backup_dir = r'C:\\project\\한글획순\\backups'
            os.makedirs(backup_dir, exist_ok=True)
            with open(os.path.join(backup_dir, 'hangul_150_parts_warehouse_latest_backup.json'), 'w', encoding='utf-8') as f:
                f.write(json_str)
        except Exception as cl_err:
            print(f"[경고] warehouse_centerlines.js 동기화 실패: {cl_err}")

`;
  code = code.replace(retTarget, clSave + retTarget);
  fs.writeFileSync(p, code, 'utf8');
  console.log('Successfully updated warehouse_server.py');
}
