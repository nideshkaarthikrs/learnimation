# scripts/manim_renderer.py
import argparse, json, os, subprocess
from jinja2 import Environment, FileSystemLoader

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--outdir", required=True)
    p.add_argument("--scene-class", default="GeneratedScene")
    p.add_argument("--script-name", default="generated_scene.py")
    p.add_argument("--quality", default="low")
    args = p.parse_args()

    with open(args.input, "r", encoding="utf8") as f:
        scene_json = json.load(f)

    templ_dir = os.path.join(os.path.dirname(__file__), "templates")
    env = Environment(loader=FileSystemLoader(templ_dir), autoescape=False)
    env.filters["tojson"] = lambda val: json.dumps(val, ensure_ascii=False)

    template = env.get_template("scene.py.j2")
    rendered = template.render(scene_json=scene_json, scene_class=args.scene_class)

    script_path = os.path.join(os.path.dirname(args.input), args.script_name)
    with open(script_path, "w", encoding="utf8") as f:
        f.write(rendered)

    quality_flag = {"low": "-ql", "medium": "-qm", "high": "-qh"}.get(
        args.quality, "-ql"
    )
    cmd = ["manim", quality_flag, script_path, args.scene_class, "--media_dir", args.outdir]
    print("Running:", " ".join(cmd))
    subprocess.check_call(cmd, cwd=os.path.dirname(script_path))

if __name__ == "__main__":
    main()
