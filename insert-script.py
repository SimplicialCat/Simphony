import os
import glob

SCRIPT_LINE = '<script src="music-player.js"></script>'
# 要处理的文件扩展名
extensions = ['*.html', '*.htm']

print(f"当前工作目录: {os.getcwd()}")
print("正在搜索 HTML 文件...\n")

html_files = []
for ext in extensions:
    html_files.extend(glob.glob(ext))

if not html_files:
    print("未找到任何 .html 或 .htm 文件。")
    exit(1)

for filename in html_files:
    print(f"处理文件: {filename}")
    
    # 检查文件是否存在且可写
    if not os.access(filename, os.W_OK):
        print(f"  ⚠️ 文件不可写，跳过")
        continue

    # 尝试以 UTF-8 读取，如果失败则尝试常见编码
    content = None
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
    for enc in encodings:
        try:
            with open(filename, 'r', encoding=enc) as f:
                content = f.read()
            print(f"  使用编码 {enc} 读取成功，文件大小 {len(content)} 字节")
            break
        except UnicodeDecodeError:
            continue
    if content is None:
        print(f"  无法读取文件（编码未知），跳过")
        continue

    # 检查是否已有脚本行
    if SCRIPT_LINE in content:
        print(f"  脚本已存在，跳过")
        continue

    # 查找 </body> 标签
    body_close = '</body>'
    pos = content.find(body_close)
    if pos == -1:
        print(f"  未找到 {body_close}，跳过")
        continue

    # 插入脚本
    new_content = content[:pos] + SCRIPT_LINE + '\n' + content[pos:]
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✅ 已插入脚本")
    except Exception as e:
        print(f"  ❌ 写入失败: {e}")

print("\n全部处理完成。")