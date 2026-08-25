# -*- coding: utf-8 -*-
"""承煜AI · 视频号素材归档教程 配图生成（品牌风格，手绘+流程图）"""
from PIL import Image, ImageDraw, ImageFont
import os, math

OUT = os.path.join(os.path.dirname(__file__), "images")
os.makedirs(OUT, exist_ok=True)

FB = "/System/Library/Fonts/STHeiti Medium.ttc"
FL = "/System/Library/Fonts/STHeiti Light.ttc"
def f(size, light=False): return ImageFont.truetype(FL if light else FB, size)

INK=(28,33,48); BLUE=(37,99,165); TEAL=(16,156,142); ORANGE=(236,130,46)
GREY=(120,128,142); LGREY=(236,239,244); WHITE=(255,255,255); RED=(210,78,70)
PURPLE=(96,104,178); SOFT=(246,248,251)

def rrect(d,xy,r,fill=None,outline=None,width=1): d.rounded_rectangle(xy,radius=r,fill=fill,outline=outline,width=width)
def center(d,cx,y,t,font,fill):
    w=d.textlength(t,font=font); d.text((cx-w/2,y),t,font=font,fill=fill); return w
def rtext(d,xr,y,t,font,fill):
    w=d.textlength(t,font=font); d.text((xr-w,y),t,font=font,fill=fill)
def wrap(d,t,font,maxw):
    lines,cur=[],""
    for ch in t:
        if d.textlength(cur+ch,font=font)<=maxw: cur+=ch
        else: lines.append(cur); cur=ch
    if cur: lines.append(cur)
    return lines
def varrow(d,cx,y0,y1,col=GREY,w=4):
    d.line([(cx,y0),(cx,y1-10)],fill=col,width=w)
    d.polygon([(cx-11,y1-14),(cx+11,y1-14),(cx,y1)],fill=col)
def harrow(d,x0,x1,cy,col=GREY,w=4):
    d.line([(x0,cy),(x1-10,cy)],fill=col,width=w)
    d.polygon([(x1-14,cy-11),(x1-14,cy+11),(x1,cy)],fill=col)
def check(d,cx,cy,col=TEAL,s=1.0):
    d.line([(cx-14*s,cy),(cx-4*s,cy+11*s),(cx+15*s,cy-13*s)],fill=col,width=int(6*s),joint="curve")
def cross(d,cx,cy,col=RED,s=1.0):
    d.line([(cx-13*s,cy-13*s),(cx+13*s,cy+13*s)],fill=col,width=int(6*s))
    d.line([(cx+13*s,cy-13*s),(cx-13*s,cy+13*s)],fill=col,width=int(6*s))

# ---------- 0. 封面 ----------
def cover():
    W,H=1080,500
    img=Image.new("RGB",(W,H),INK); d=ImageDraw.Draw(img)
    for y in range(H):
        t=y/H; r=int(26+(37-26)*t); g=int(30+(99-30)*t); b=int(50+(165-50)*t)
        d.line([(0,y),(W,y)],fill=(r,g,b))
    d.ellipse([840,-130,1180,210],outline=(255,255,255),width=2)
    d.ellipse([790,300,1070,580],outline=TEAL,width=3)
    rrect(d,[70,60,330,112],26,outline=TEAL,width=2)
    center(d,200,72,"承煜AI · 实战拆解",f(26),(180,230,224))
    d.text((70,150),"视频号刷到的好素材，",font=f(54),fill=WHITE)
    d.text((70,224),"怎么",font=f(54),fill=WHITE)
    d.text((218,224),"一键存成 MP4",font=f(54),fill=ORANGE)
    d.text((640,224),"？",font=f(54),fill=WHITE)
    d.text((70,322),"从一个开源项目，到接入公众号下载",font=f(28,True),fill=(206,216,230))
    d.text((70,366),"搭建过程和遇到的问题，记录一下",font=f(28,True),fill=(206,216,230))
    rrect(d,[70,430,250,476],23,fill=(255,255,255))
    center(d,160,440,"复制链接",f(24),BLUE)
    harrow(d,256,300,453,col=(180,200,220),w=4)
    rrect(d,[306,430,486,476],23,fill=(255,255,255))
    center(d,396,440,"发公众号",f(24),TEAL)
    harrow(d,492,536,453,col=(180,200,220),w=4)
    rrect(d,[542,430,722,476],23,fill=ORANGE)
    center(d,632,440,"点链接下载",f(24),WHITE)
    img.save(os.path.join(OUT,"fig-cover.png"))

# ---------- 1. 用户三步操作 ----------
def steps():
    W,H=1080,540
    img=Image.new("RGB",(W,H),WHITE); d=ImageDraw.Draw(img)
    center(d,W/2,46,"用户侧，只需要三步",f(42),INK)
    center(d,W/2,108,"不用装App，不用学操作——会发微信就会用",f(24,True),GREY)
    cards=[("1","在视频号里","点开要存的视频，点「分享 → 复制链接」",BLUE,"🔗"),
           ("2","发给公众号","把链接粘贴进对话框，直接发送",TEAL,"💬"),
           ("3","点链接下载","公众号秒回一条短链接，点开就能存进手机",ORANGE,"⬇️")]
    cw,gap=300,40; total=cw*3+gap*2; x0=(W-total)//2; top=180; ch=300
    for i,(num,ti,sub,col,emo) in enumerate(cards):
        x=x0+i*(cw+gap)
        rrect(d,[x,top,x+cw,top+ch],22,fill=SOFT)
        rrect(d,[x,top,x+cw,top+8],4,fill=col)
        d.ellipse([x+cw/2-34,top+34,x+cw/2+34,top+102],fill=col)
        center(d,x+cw/2,top+46,num,f(46),WHITE)
        center(d,x+cw/2,top+128,ti,f(32),INK)
        for j,ln in enumerate(wrap(d,sub,f(23,True),cw-56)):
            center(d,x+cw/2,top+182+j*36,ln,f(23,True),(90,96,110))
        if i<2:
            ax=x+cw+gap/2; harrow(d,ax-14,ax+14,top+ch/2,col=GREY,w=5)
    img.save(os.path.join(OUT,"fig-steps.png"))

# ---------- 2. 完整链路（后台发生了什么） ----------
def flow():
    W,H=1080,860
    img=Image.new("RGB",(W,H),WHITE); d=ImageDraw.Draw(img)
    center(d,W/2,40,"你发一条链接，后台发生了什么",f(40),INK)
    center(d,W/2,100,"从「复制链接」到「点击下载」的完整链路",f(24,True),GREY)
    rows=[("你","在公众号发送视频号分享链接",BLUE),
          ("微信服务器","把这条消息转发到我们的回调地址",PURPLE),
          ("解析服务","看懂链接，取出作者、标题、真实视频地址",TEAL),
          ("短链接票据","生成一个10分钟有效的短码，存进内存",ORANGE),
          ("公众号","秒回一条 saveclip.cn/d/xxxx 短链接",BLUE),
          ("你","点开短链接，视频按「作者_标题.mp4」存下来",INK)]
    x0,x1=150,930; top=150; bh=86; gap=34
    for i,(t,s,col) in enumerate(rows):
        y=top+i*(bh+gap)
        rrect(d,[x0,y,x1,y+bh],16,fill=col)
        d.text((x0+34,y+24),t,font=f(32),fill=WHITE)
        for ln in wrap(d,s,f(23,True),440)[:1]:
            rtext(d,x1-34,y+30,s,f(22,True),(255,255,255))
        if i<len(rows)-1:
            varrow(d,W/2,y+bh+2,y+bh+gap,col=GREY,w=4)
    img.save(os.path.join(OUT,"fig-flow.png"))

# ---------- 3. 四条入口选型 ----------
def entries():
    W,H=1080,640
    img=Image.new("RGB",(W,H),WHITE); d=ImageDraw.Draw(img)
    center(d,W/2,40,"入口选哪个？我比过四条路",f(40),INK)
    center(d,W/2,100,"目标只有一个：让用户少点几下",f(24,True),GREY)
    items=[("iPhone 快捷指令","双击手机背面打开网页","要手动装配置，门槛高",False),
           ("企业微信客服","扫码加客服再发链接","多一步跳转，留作备用",False),
           ("小程序","小程序里解析下载","开发审核都重，太慢",False),
           ("公众号直聊","对话框直接发链接","操作最少，就选它",True)]
    cw,gap=470,40; ch=210; x0=(W-(cw*2+gap))//2; top=150
    for i,(ti,desc,note,win) in enumerate(items):
        r,c=divmod(i,2); x=x0+c*(cw+gap); y=top+r*(ch+30)
        bg=(235,247,244) if win else SOFT
        rrect(d,[x,y,x+cw,y+ch],20,fill=bg,outline=(TEAL if win else None),width=3 if win else 1)
        if win: check(d,x+cw-50,y+44,col=TEAL,s=1.2)
        else: d.ellipse([x+cw-58,y+30,x+cw-30,y+58],outline=GREY,width=3)
        d.text((x+38,y+34),ti,font=f(34),fill=(TEAL if win else INK))
        d.text((x+38,y+96),desc,font=f(25,True),fill=(70,76,90))
        d.text((x+38,y+144),note,font=f(24),fill=(ORANGE if win else GREY))
    img.save(os.path.join(OUT,"fig-entries.png"))

# ---------- 4. 短链接踩坑 ----------
def pitfall():
    W,H=1080,720
    img=Image.new("RGB",(W,H),WHITE); d=ImageDraw.Draw(img)
    center(d,W/2,40,"踩过最深的坑：链接一点就说「已过期」",f(36),INK)
    center(d,W/2,98,"明明设了10分钟，为什么秒过期？",f(24,True),GREY)
    # 左：错误
    lx=70; ly=170; lw=440; lh=470
    rrect(d,[lx,ly,lx+lw,ly+lh],20,fill=(252,238,237))
    cross(d,lx+44,ly+44,col=RED,s=1.1); d.text((lx+76,ly+24),"原来的做法",font=f(30),fill=RED)
    steps_l=["公众号直接回复一条超长链接","里面塞了视频地址+签名+过期时间","微信觉得太长，悄悄把后半段截断","签名和过期时间丢了","服务器一看不完整 → 判定「已过期」"]
    for i,t in enumerate(steps_l):
        y=ly+100+i*68
        d.ellipse([lx+30,y+4,lx+50,y+24],fill=RED)
        for j,ln in enumerate(wrap(d,t,f(23,True),lw-90)):
            d.text((lx+66,y+j*30),ln,font=f(23,True),fill=INK)
    # 右：正确
    rx=570; rw=440
    rrect(d,[rx,ly,rx+rw,ly+lh],20,fill=(235,247,244))
    check(d,rx+44,ly+42,col=TEAL,s=1.2); d.text((rx+78,ly+24),"改后的做法",font=f(30),fill=TEAL)
    steps_r=["把长地址存进服务器内存","换发一个超短的 /d/xxxx 短码","微信不会截断短链接","点开短码，服务器再换回真实地址","10分钟内有效，聊天里也不暴露视频源"]
    for i,t in enumerate(steps_r):
        y=ly+100+i*68
        d.ellipse([rx+30,y+4,rx+50,y+24],fill=TEAL)
        for j,ln in enumerate(wrap(d,t,f(23,True),rw-90)):
            d.text((rx+66,y+j*30),ln,font=f(23,True),fill=INK)
    img.save(os.path.join(OUT,"fig-pitfall.png"))

# ---------- 5. 上线前的边界清单 ----------
def boundary():
    W,H=1080,620
    img=Image.new("RGB",(W,H),WHITE); d=ImageDraw.Draw(img)
    center(d,W/2,40,"先把话说在前头：现在到哪了",f(38),INK)
    center(d,W/2,100,"自用没问题，对外正式运营还得补几样",f(24,True),GREY)
    lx=70; top=160; cw=440; ch=400
    rrect(d,[lx,top,lx+cw,top+ch],20,fill=(235,247,244))
    check(d,lx+42,top+40,col=TEAL,s=1.1); d.text((lx+76,top+22),"已经跑通",font=f(30),fill=TEAL)
    done=["公众号直聊，发链接秒回","手机端网页版下载页","短链接防截断、防过期","文件按 作者_标题.mp4 命名","HTTPS 证书 + 域名","企业微信客服备用入口"]
    for i,t in enumerate(done):
        y=top+92+i*48; d.ellipse([lx+32,y+5,lx+50,y+23],fill=TEAL); d.text((lx+64,y),t,font=f(24,True),fill=INK)
    rx=570
    rrect(d,[rx,top,rx+cw,top+ch],20,fill=(255,243,228))
    d.text((rx+34,top+30),"!",font=f(40),fill=ORANGE); d.text((rx+76,top+22),"对外前要补",font=f(30),fill=ORANGE)
    todo=["解析换成自研/有授权的接口","单用户、单IP 限流","短链改存 Redis（重启不丢）","用户授权记录、日志脱敏","隐私政策 + 服务条款","投诉、下架、监控告警"]
    for i,t in enumerate(todo):
        y=top+92+i*48; d.ellipse([rx+32,y+5,rx+50,y+23],fill=ORANGE); d.text((rx+64,y),t,font=f(24,True),fill=INK)
    img.save(os.path.join(OUT,"fig-boundary.png"))

cover(); steps(); flow(); entries(); pitfall(); boundary()
print("done:", [x for x in sorted(os.listdir(OUT)) if x.startswith("fig-")])
PY = None
