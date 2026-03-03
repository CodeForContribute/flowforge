#!/usr/bin/env python3
"""Generate FlowForge investor pitch deck as a PDF (4-page India version)."""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics import renderPDF

# ── Colors ──
ACCENT = HexColor('#6366F1')
ACCENT_LIGHT = HexColor('#818CF8')
ACCENT_BG = HexColor('#EEF2FF')
DARK = HexColor('#0F172A')
MUTED = HexColor('#475569')
LIGHT_GRAY = HexColor('#94A3B8')
BORDER = HexColor('#E2E8F0')
BG_LIGHT = HexColor('#F8FAFC')
SUCCESS = HexColor('#10B981')
SUCCESS_BG = HexColor('#F0FDF4')
RED = HexColor('#B91C1C')
RED_BG = HexColor('#FEF2F2')
RED_BORDER = HexColor('#FECACA')
ORANGE = HexColor('#92400E')
ORANGE_BG = HexColor('#FEF3C7')
ORANGE_BORDER = HexColor('#FED7AA')
ORANGE_TEXT = HexColor('#B45309')
GREEN_DARK = HexColor('#065F46')
GREEN_MED = HexColor('#047857')

W, H = A4

# ── Styles ──
styles = getSampleStyleSheet()

def make_style(name, parent='Normal', fontSize=10, textColor=MUTED, leading=14,
               alignment=TA_LEFT, spaceAfter=4, spaceBefore=0, fontName='Helvetica',
               bold=False):
    return ParagraphStyle(
        name, parent=styles['Normal'],
        fontName='Helvetica-Bold' if bold else fontName,
        fontSize=fontSize, textColor=textColor, leading=leading,
        alignment=alignment, spaceAfter=spaceAfter, spaceBefore=spaceBefore,
    )

S_H1 = make_style('H1', fontSize=22, textColor=DARK, leading=26, bold=True, spaceAfter=6)
S_H2 = make_style('H2', fontSize=14, textColor=DARK, leading=18, bold=True, spaceAfter=4)
S_H3 = make_style('H3', fontSize=11, textColor=DARK, leading=14, bold=True, spaceAfter=2)
S_H4 = make_style('H4', fontSize=9, textColor=DARK, leading=12, bold=True, spaceAfter=2)
S_BODY = make_style('Body', fontSize=9, textColor=MUTED, leading=13, spaceAfter=4)
S_SMALL = make_style('Small', fontSize=8, textColor=MUTED, leading=11, spaceAfter=2)
S_TINY = make_style('Tiny', fontSize=7, textColor=LIGHT_GRAY, leading=9, spaceAfter=0)
S_LABEL = make_style('Label', fontSize=7.5, textColor=ACCENT, leading=10, bold=True, spaceAfter=2, spaceBefore=10)
S_CENTER = make_style('Center', fontSize=9, textColor=MUTED, leading=13, alignment=TA_CENTER)
S_CENTER_BIG = make_style('CenterBig', fontSize=16, textColor=DARK, leading=20, bold=True, alignment=TA_CENTER, spaceAfter=4)
S_CENTER_SM = make_style('CenterSm', fontSize=10, textColor=MUTED, leading=14, alignment=TA_CENTER)
S_STAT_NUM = make_style('StatNum', fontSize=20, textColor=ACCENT, leading=24, bold=True, alignment=TA_CENTER, spaceAfter=1)
S_STAT_LBL = make_style('StatLbl', fontSize=7, textColor=MUTED, leading=9, alignment=TA_CENTER, spaceAfter=2)
S_ACCENT_BODY = make_style('AccentBody', fontSize=8.5, textColor=MUTED, leading=12, spaceAfter=2)

# For table cells
S_CELL = make_style('Cell', fontSize=8, textColor=MUTED, leading=10, spaceAfter=1)
S_CELL_BOLD = make_style('CellBold', fontSize=8, textColor=DARK, leading=10, bold=True, spaceAfter=1)
S_CELL_CHECK = make_style('CellCheck', fontSize=8, textColor=SUCCESS, leading=10, bold=True, spaceAfter=1)
S_CELL_CROSS = make_style('CellCross', fontSize=8, textColor=HexColor('#CBD5E1'), leading=10, spaceAfter=1)
S_CELL_HL = make_style('CellHL', fontSize=8, textColor=ACCENT, leading=10, bold=True, spaceAfter=1)


def header_block(subtitle=''):
    """Page header table."""
    data = [[
        Paragraph('<b>FlowForge</b>', make_style('Logo', fontSize=14, textColor=DARK, bold=True)),
        Paragraph(subtitle, make_style('Meta', fontSize=7, textColor=LIGHT_GRAY, alignment=TA_RIGHT)),
    ]]
    t = Table(data, colWidths=[80*mm, 90*mm])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, DARK),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
    ]))
    return t


def footer_block(page_num):
    data = [[
        Paragraph('FlowForge — Confidential', S_TINY),
        Paragraph(f'Page {page_num} of 4', make_style('FR', fontSize=7, textColor=LIGHT_GRAY, alignment=TA_RIGHT)),
    ]]
    t = Table(data, colWidths=[85*mm, 85*mm])
    t.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
    ]))
    return t


def stat_cell(num, label, num_color=ACCENT, bg=BG_LIGHT):
    """Return a list of flowables for a stat box."""
    return [
        Paragraph(f'<b>{num}</b>', make_style('SN', fontSize=18, textColor=num_color, leading=22, bold=True, alignment=TA_CENTER, spaceAfter=1)),
        Paragraph(label, make_style('SL', fontSize=7, textColor=MUTED, leading=9, alignment=TA_CENTER, spaceAfter=2)),
    ]


def card_table(cells_data, col_widths, bg_color=BG_LIGHT, border_color=BORDER):
    """Create a styled card-like table."""
    t = Table(cells_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_color),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    return t


def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=6, spaceBefore=6)


# ══════════════════════════════════════════════════════════════════
# BUILD DOCUMENT
# ══════════════════════════════════════════════════════════════════

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'FlowForge-Investor-Deck-India.pdf')

doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=1.5*cm, bottomMargin=1.5*cm,
)

story = []
content_width = W - 4*cm  # usable width

# ════════════════════════════════════════════════════════════════
# PAGE 1 — COVER + PROBLEM + SOLUTION
# ════════════════════════════════════════════════════════════════

story.append(header_block('Confidential  |  Seed Round  |  March 2026'))
story.append(Spacer(1, 6*mm))

# Hero box
hero_data = [[
    [
        Paragraph('<b>Ship Software Faster with<br/>AI-Powered Project Management</b>',
                   make_style('HeroH', fontSize=18, textColor=white, leading=22, bold=True, spaceAfter=6)),
        Paragraph('The first PM platform that doesn\'t just track work — it does the work. '
                  'AI code generation, GitHub integration, and smart sprint planning in one workflow.',
                  make_style('HeroP', fontSize=9.5, textColor=HexColor('#94A3B8'), leading=13, spaceAfter=6)),
        Paragraph('<b>Raising ₹20 Cr (~$2.5M) Seed Round</b>',
                  make_style('HeroBadge', fontSize=9, textColor=ACCENT_LIGHT, leading=12, bold=True)),
    ]
]]
hero = Table(hero_data, colWidths=[content_width])
hero.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), DARK),
    ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ('LEFTPADDING', (0, 0), (-1, -1), 20),
    ('RIGHTPADDING', (0, 0), (-1, -1), 20),
    ('TOPPADDING', (0, 0), (-1, -1), 18),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 18),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(hero)
story.append(Spacer(1, 5*mm))

# Problem
story.append(Paragraph('THE PROBLEM', S_LABEL))
story.append(Paragraph('<b>Engineering teams lose 23% of their time to tooling overhead</b>', S_H2))
story.append(Spacer(1, 2*mm))

prob_data = [[
    [Paragraph('<b><font color="#991B1B">Tool Fragmentation</font></b>', S_H4),
     Paragraph('<font color="#B91C1C">Teams juggle 5-7 tools — Jira, GitHub, Slack, CI/CD — losing hours daily to context switching.</font>', S_SMALL)],
    [Paragraph('<b><font color="#991B1B">Slow PR Cycles</font></b>', S_H4),
     Paragraph('<font color="#B91C1C">Average PR sits open 4.5 days. Code reviews bottleneck delivery. Junior devs wait days for feedback.</font>', S_SMALL)],
    [Paragraph('<b><font color="#991B1B">Planning Theater</font></b>', S_H4),
     Paragraph('<font color="#B91C1C">Sprint planning takes hours, estimates are guesswork, retrospectives produce the same action items.</font>', S_SMALL)],
]]
cw = content_width / 3 - 2*mm
prob_t = Table(prob_data, colWidths=[cw, cw, cw], hAlign='LEFT')
prob_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), RED_BG),
    ('BOX', (0, 0), (0, 0), 0.5, RED_BORDER),
    ('BOX', (1, 0), (1, 0), 0.5, RED_BORDER),
    ('BOX', (2, 0), (2, 0), 0.5, RED_BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('ROUNDEDCORNERS', [4, 4, 4, 4]),
]))
story.append(prob_t)

story.append(hr())

# Solution
story.append(Paragraph('THE SOLUTION', S_LABEL))
story.append(Paragraph('<b>One platform that plans, codes, reviews, and ships</b>', S_H2))
story.append(Paragraph(
    'FlowForge replaces the fragmented toolchain with an AI-native workflow automating '
    'the entire SDLC — from task creation to merged PR.', S_BODY))
story.append(Spacer(1, 2*mm))

# Flow diagram
flow_text = ('  <b><font color="#6366F1">Create Task</font></b>  →  '
             '<b><font color="#6366F1">AI Codes</font></b>  →  '
             '<b><font color="#6366F1">Human Reviews</font></b>  →  '
             '<b><font color="#6366F1">AI Responds</font></b>  →  '
             '<b><font color="#6366F1">Ship It</font></b>')
story.append(Paragraph(flow_text, make_style('Flow', fontSize=10, leading=14, alignment=TA_CENTER,
                                              textColor=ACCENT, spaceAfter=6, spaceBefore=2)))
story.append(Spacer(1, 2*mm))

# Feature cards (2x2)
feat_w = content_width / 2 - 2*mm
feats = [
    ('<b>AI Code Generation</b>', 'Generates production-ready code from task descriptions — including tests, error handling, and PR creation. Supports OpenAI GPT-4o and Anthropic Claude.'),
    ('<b>Deep GitHub Integration</b>', 'Auto-creates branches and PRs, processes webhooks in real-time, tracks CI/CD status, and syncs bidirectionally with repositories.'),
    ('<b>AI Sprint Planning</b>', 'Intelligent story point estimation, risk assessment, dependency detection, and automatic retrospective generation from sprint data.'),
    ('<b>Smart Review Handling</b>', 'AI classifies review comments as code changes vs. discussions, generates contextual responses, and updates code based on feedback.'),
]
feat_data = []
for i in range(0, 4, 2):
    row = []
    for j in range(2):
        row.append([
            Paragraph(feats[i+j][0], S_H4),
            Paragraph(feats[i+j][1], S_SMALL),
        ])
    feat_data.append(row)

feat_t = Table(feat_data, colWidths=[feat_w, feat_w])
feat_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
    ('BOX', (0, 0), (0, 0), 0.5, BORDER), ('BOX', (1, 0), (1, 0), 0.5, BORDER),
    ('BOX', (0, 1), (0, 1), 0.5, BORDER), ('BOX', (1, 1), (1, 1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(feat_t)

story.append(Spacer(1, 4*mm))
story.append(footer_block(1))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# PAGE 2 — MARKET + COMPETITION + INDIA ANGLE
# ════════════════════════════════════════════════════════════════

story.append(header_block('Market Opportunity & Competitive Landscape'))
story.append(Spacer(1, 4*mm))

story.append(Paragraph('MARKET OPPORTUNITY', S_LABEL))
story.append(Paragraph('<b>A massive global market — with India as a unique wedge</b>', S_H2))
story.append(Spacer(1, 3*mm))

# Market stats row
sw = content_width / 4 - 2*mm
mkt_data = [[
    stat_cell('$85B', 'Project Mgmt TAM (Global)'),
    stat_cell('$22B', 'Developer Tools SAM'),
    stat_cell('$4.5B', 'AI DevTools SOM (Target)'),
    stat_cell('28M+', 'Professional Developers'),
]]
mkt_t = Table(mkt_data, colWidths=[sw, sw, sw, sw])
mkt_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
    ('BOX', (0, 0), (0, 0), 0.5, BORDER), ('BOX', (1, 0), (1, 0), 0.5, BORDER),
    ('BOX', (2, 0), (2, 0), 0.5, BORDER), ('BOX', (3, 0), (3, 0), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
story.append(mkt_t)
story.append(Spacer(1, 3*mm))

# India Advantage
india_data = [[
    [Paragraph('<b><font color="#92400E">India Advantage</font></b>', S_H4),
     Paragraph(
         '<font color="#B45309">India has <b>5.8M+ developers</b> (2nd largest globally) and 1,600+ GCCs employing 1.9M+ '
         'tech professionals. Indian IT services ($250B+) are under pressure to adopt AI-native tooling. FlowForge is '
         'built in India with <b>3-4x capital efficiency</b> vs. US peers — the same playbook that built Freshworks '
         '($12B), Postman ($5.6B), and Zoho into global SaaS leaders. Land with India\'s startup ecosystem, expand '
         'globally via GitHub\'s developer network.</font>', S_SMALL)]
]]
india_t = Table(india_data, colWidths=[content_width])
india_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), ORANGE_BG),
    ('BOX', (0, 0), (-1, -1), 0.5, ORANGE_BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
story.append(india_t)
story.append(Spacer(1, 3*mm))

# Two columns: Target Customers | Competition
left_w = content_width * 0.45
right_w = content_width * 0.55

# Target customers
cust_items = [
    '<b>Primary — Startups & SMBs:</b> 5-50 person teams on GitHub. ACV: ₹50K-3L/yr.',
    '<b>Secondary — GCCs & Mid-Market:</b> 50-500 engineers in 1,600+ GCCs. ACV: ₹40L-1.5Cr/yr.',
    '<b>Expansion — Enterprise / IT Services:</b> SSO, on-prem, SLAs. ACV: ₹1.5Cr+/yr.',
]
left_content = [Paragraph('TARGET CUSTOMERS', S_LABEL)]
for item in cust_items:
    left_content.append(Paragraph(f'• {item}', S_SMALL))

# Why Now
left_content.append(Spacer(1, 3*mm))
why_data = [[
    [Paragraph('<b><font color="#6366F1">Why Now?</font></b> '
               'LLMs crossed the production-code-quality threshold in 2025. AI coding tools normalized AI-assisted '
               'development. But no tool connects task mgmt → code gen → review → deployment. FlowForge is first to close this loop.',
               S_SMALL)]
]]
why_t = Table(why_data, colWidths=[left_w - 4*mm])
why_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), ACCENT_BG),
    ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#C7D2FE')),
    ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
left_content.append(why_t)

# Competition table
right_content = [Paragraph('COMPETITIVE LANDSCAPE', S_LABEL)]

comp_headers = ['Capability', 'FlowForge', 'Jira', 'Linear', 'Copilot']
comp_rows = [
    ['Task & Sprint Mgmt', '✓ Full', '✓ Full', '✓ Full', '✗'],
    ['AI Code Generation', '✓ Full', '✗', '✗', 'Inline'],
    ['Auto PR Creation', '✓ Full', '✗', '✗', '✗'],
    ['AI Review Response', '✓ Full', '✗', '✗', '✗'],
    ['AI Sprint Planning', '✓ Full', '✗', '✗', '✗'],
    ['GitHub Integration', '✓ Native', 'Plugin', '✓ Good', '✓ Native'],
    ['Task→Code→PR Loop', '✓ E2E', '✗', '✗', '✗'],
    ['Multi AI Provider', '✓ 2', '✗', '✗', '✗'],
]

comp_data = []
# Header row
comp_data.append([Paragraph(f'<b>{h}</b>', S_CELL_HL if i == 1 else S_CELL_BOLD) for i, h in enumerate(comp_headers)])
for row in comp_rows:
    styled_row = []
    for i, cell in enumerate(row):
        if i == 0:
            styled_row.append(Paragraph(f'<b>{cell}</b>', S_CELL_BOLD))
        elif cell.startswith('✓'):
            styled_row.append(Paragraph(f'<b>{cell}</b>', S_CELL_CHECK))
        elif cell == '✗':
            styled_row.append(Paragraph(cell, S_CELL_CROSS))
        else:
            styled_row.append(Paragraph(cell, S_CELL))
    comp_data.append(styled_row)

rcw = right_w - 4*mm
comp_cws = [rcw*0.28, rcw*0.20, rcw*0.16, rcw*0.16, rcw*0.20]
comp_t = Table(comp_data, colWidths=comp_cws)
comp_style = [
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]
# Highlight FlowForge column
for r in range(len(comp_data)):
    comp_style.append(('BACKGROUND', (1, r), (1, r), ACCENT_BG))
comp_t.setStyle(TableStyle(comp_style))
right_content.append(comp_t)

# Moat callout
right_content.append(Spacer(1, 3*mm))
moat_data = [[
    [Paragraph('<b><font color="#6366F1">Moat: Data Flywheel</font></b> — '
               'Every AI execution improves code quality, review accuracy, and estimation precision. '
               'Compounding data advantages competitors can\'t replicate.',
               S_SMALL)]
]]
moat_t = Table(moat_data, colWidths=[rcw])
moat_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), ACCENT_BG),
    ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#C7D2FE')),
    ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
right_content.append(moat_t)

# Combine into 2-column layout
main_2col = Table([[left_content, right_content]], colWidths=[left_w, right_w])
main_2col.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (0, 0), 0),
    ('RIGHTPADDING', (0, 0), (0, 0), 4),
    ('LEFTPADDING', (1, 0), (1, 0), 4),
    ('RIGHTPADDING', (1, 0), (1, 0), 0),
]))
story.append(main_2col)

story.append(Spacer(1, 4*mm))
story.append(footer_block(2))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# PAGE 3 — BUSINESS MODEL + TRACTION + ROADMAP
# ════════════════════════════════════════════════════════════════

story.append(header_block('Business Model, Traction & Roadmap'))
story.append(Spacer(1, 4*mm))

half_w = content_width / 2 - 3*mm

# Left: Business Model
left3 = []
left3.append(Paragraph('BUSINESS MODEL', S_LABEL))
left3.append(Paragraph('<b>SaaS + Usage-Based AI Upside</b>', S_H2))
left3.append(Spacer(1, 2*mm))

# Pricing
pw = (half_w - 4*mm) / 3
price_data = [
    [Paragraph('<b>FREE</b>', make_style('PT', fontSize=7, textColor=ACCENT, bold=True, alignment=TA_CENTER)),
     Paragraph('<b>PRO</b>', make_style('PT', fontSize=7, textColor=ACCENT, bold=True, alignment=TA_CENTER)),
     Paragraph('<b>ENTERPRISE</b>', make_style('PT', fontSize=7, textColor=ACCENT, bold=True, alignment=TA_CENTER))],
    [Paragraph('<b>₹0</b>', make_style('PP', fontSize=14, textColor=DARK, bold=True, alignment=TA_CENTER)),
     Paragraph('<b>₹999</b><font size="7">/user/mo</font>', make_style('PP2', fontSize=14, textColor=DARK, bold=True, alignment=TA_CENTER)),
     Paragraph('<b>Custom</b>', make_style('PP3', fontSize=12, textColor=DARK, bold=True, alignment=TA_CENTER))],
    [Paragraph('✓ Up to 3 projects\n✓ GitHub integration\n✓ Basic AI', S_SMALL),
     Paragraph('✓ Unlimited projects\n✓ Advanced AI gen\n✓ Sprint analytics\n✓ Priority support', S_SMALL),
     Paragraph('✓ SSO / SAML\n✓ On-premise deploy\n✓ Custom integrations\n✓ SLA guarantees', S_SMALL)],
]
price_t = Table(price_data, colWidths=[pw, pw, pw])
price_style = [
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('BACKGROUND', (1, 0), (1, -1), ACCENT_BG),
]
price_t.setStyle(TableStyle(price_style))
left3.append(price_t)
left3.append(Spacer(1, 2*mm))

left3.append(Paragraph('<b>Revenue drivers:</b> Seat-based SaaS (predictable MRR) + AI execution credits (usage upside) + Enterprise annual contracts.', S_SMALL))
left3.append(Spacer(1, 2*mm))

# Unit Economics
left3.append(Paragraph('TARGET UNIT ECONOMICS', S_LABEL))
econ_items = [
    ('LTV (per seat)', '₹2.4L ($2,880)'),
    ('CAC', '₹26K ($320)'),
    ('LTV:CAC Ratio', '<font color="#6366F1"><b>9:1</b></font>'),
    ('Gross Margin', '78%'),
    ('Net Revenue Retention', '125%'),
    ('Payback Period', '4 months'),
]
econ_data = []
for label, val in econ_items:
    econ_data.append([
        Paragraph(label, S_SMALL),
        Paragraph(f'<b>{val}</b>', make_style('EV', fontSize=8, textColor=DARK, bold=True, alignment=TA_RIGHT, leading=11)),
    ])
econ_t = Table(econ_data, colWidths=[half_w*0.55, half_w*0.45 - 4*mm])
econ_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
    ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
left3.append(econ_t)
left3.append(Spacer(1, 2*mm))

# Land & Expand
le_data = [[[
    Paragraph('<b><font color="#065F46">Land & Expand:</font></b> '
              '<font color="#047857">Free tier drives adoption → teams upgrade as AI proves value → '
              'avg expansion 3x in 6 months. PLG keeps CAC low.</font>', S_SMALL)
]]]
le_t = Table(le_data, colWidths=[half_w - 4*mm])
le_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), SUCCESS_BG),
    ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#BBF7D0')),
    ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
left3.append(le_t)

# Right: Traction + Roadmap
right3 = []
right3.append(Paragraph('TRACTION', S_LABEL))
right3.append(Paragraph('<b>Product-First, Capital-Efficient</b>', S_H2))
right3.append(Spacer(1, 2*mm))

# Traction stats
tsw = (half_w - 4*mm) / 2
trac_data = [
    [stat_cell('295+', 'Source files shipped'), stat_cell('50+', 'Features built')],
    [stat_cell('15+', 'PRs merged'), stat_cell('2', 'AI providers')],
]
trac_t = Table(trac_data, colWidths=[tsw, tsw])
trac_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
    ('BOX', (0, 0), (0, 0), 0.5, BORDER), ('BOX', (1, 0), (1, 0), 0.5, BORDER),
    ('BOX', (0, 1), (0, 1), 0.5, BORDER), ('BOX', (1, 1), (1, 1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
right3.append(trac_t)
right3.append(Spacer(1, 2*mm))

trac_bullets = [
    'Full Kanban board with drag-and-drop, WIP limits, task hierarchy',
    'End-to-end AI code generation with human-in-the-loop review',
    'Deep GitHub integration — webhooks, PR management, CI/CD tracking',
    'AI sprint planning — risk assessment, dependency detection, auto-retros',
    'Multi-tenant org support with role-based access control',
    'Open-source community with organic contributors',
]
for b in trac_bullets:
    right3.append(Paragraph(f'• {b}', S_SMALL))

right3.append(Spacer(1, 3*mm))
right3.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=3, spaceBefore=0))

# Roadmap
right3.append(Paragraph('ROADMAP', S_LABEL))
phases = [
    ('✓ Phase 1 — Foundation (Done)', 'Core PM, Kanban, sprints, GitHub, AI code gen pipeline', SUCCESS),
    ('→ Phase 2 — Intelligence (Q2 2026)', 'Analytics, velocity/burndown charts, time tracking', HexColor('#3B82F6')),
    ('Phase 3 — Ecosystem (Q3 2026)', 'Slack, GitLab, Jira migration, API marketplace', ORANGE_TEXT),
    ('Phase 4 — Enterprise (Q4 2026)', 'SSO/SAML, on-premise, SOC 2, audit logs, RBAC', ORANGE_TEXT),
]
for title, desc, color in phases:
    right3.append(Paragraph(f'<b><font color="{color.hexval()}">{title}</font></b> — {desc}', S_SMALL))

# Combine
main_3 = Table([[left3, right3]], colWidths=[half_w, half_w])
main_3.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (0, 0), 0), ('RIGHTPADDING', (0, 0), (0, 0), 3),
    ('LEFTPADDING', (1, 0), (1, 0), 3), ('RIGHTPADDING', (1, 0), (1, 0), 0),
]))
story.append(main_3)

story.append(Spacer(1, 4*mm))
story.append(footer_block(3))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# PAGE 4 — THE ASK + MILESTONES + CLOSING
# ════════════════════════════════════════════════════════════════

story.append(header_block('The Ask & Vision'))
story.append(Spacer(1, 4*mm))

story.append(Paragraph('THE ASK', S_LABEL))
story.append(Paragraph('<b>Raising ₹20 Crore (~$2.5M) Seed Round</b>', S_H1))
story.append(Paragraph(
    'To accelerate product development, launch publicly, build the go-to-market engine, '
    'and capture the AI-native project management category — from India, for the world.',
    make_style('AskP', fontSize=10, textColor=MUTED, leading=14, spaceAfter=8)))

# Big stats
ask_sw = content_width / 3 - 2*mm
ask_data = [[
    stat_cell('₹20 Cr', 'Seed Round (~$2.5M)', ACCENT, ACCENT_BG),
    stat_cell('18 mo', 'Runway to Series A', SUCCESS, SUCCESS_BG),
    stat_cell('₹16 Cr+', 'ARR Target (2027)', HexColor('#F59E0B'), ORANGE_BG),
]]
ask_t = Table(ask_data, colWidths=[ask_sw, ask_sw, ask_sw])
ask_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), ACCENT_BG), ('BOX', (0, 0), (0, 0), 0.5, HexColor('#C7D2FE')),
    ('BACKGROUND', (1, 0), (1, 0), SUCCESS_BG), ('BOX', (1, 0), (1, 0), 0.5, HexColor('#BBF7D0')),
    ('BACKGROUND', (2, 0), (2, 0), ORANGE_BG), ('BOX', (2, 0), (2, 0), 0.5, ORANGE_BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
]))
story.append(ask_t)
story.append(Spacer(1, 4*mm))

# Two columns: Use of Funds | Milestones
left4 = []
left4.append(Paragraph('USE OF FUNDS', S_LABEL))

funds = [
    ('Engineering (50%)', '₹10 Cr', 'Hire 3-4 senior engineers to accelerate roadmap'),
    ('AI Infrastructure (20%)', '₹4 Cr', 'API costs, model fine-tuning, execution pipeline'),
    ('Go-to-Market (20%)', '₹4 Cr', 'DevRel, content marketing, India GTM'),
    ('Operations (10%)', '₹2 Cr', 'Legal, compliance (SOC 2), infrastructure'),
]
fund_data = []
for cat, amt, desc in funds:
    fund_data.append([
        Paragraph(f'<b>{cat}</b>', S_SMALL),
        Paragraph(f'<b><font color="#6366F1">{amt}</font></b>', make_style('FA', fontSize=8, textColor=ACCENT, bold=True, alignment=TA_RIGHT, leading=11)),
    ])
    fund_data.append([
        Paragraph(desc, make_style('FD', fontSize=7.5, textColor=MUTED, leading=10, spaceAfter=4)),
        Paragraph('', S_SMALL),
    ])

fund_t = Table(fund_data, colWidths=[half_w*0.65, half_w*0.35 - 4*mm])
fund_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
]))
left4.append(fund_t)

right4 = []
right4.append(Paragraph('KEY MILESTONES', S_LABEL))

milestones = [
    ('Q2 2026 — Public Beta', 'Open sign-ups, free tier, community building. Target: 500 active teams.', BG_LIGHT, BORDER),
    ('Q3 2026 — Revenue Launch', 'Pro tier, GCC outreach, enterprise pilots. Target: ₹40L MRR.', BG_LIGHT, BORDER),
    ('Q4 2026 — Enterprise Ready', 'SOC 2, SSO/SAML, on-premise. Target: 3 enterprise contracts.', BG_LIGHT, BORDER),
    ('2027 — Series A Position', '₹16 Cr+ ARR, 50+ paying teams, proven unit economics, category leadership.', ACCENT_BG, HexColor('#C7D2FE')),
]
for title, desc, bg, bdr in milestones:
    ms_data = [[[
        Paragraph(f'<b>{title}</b>', S_H4),
        Paragraph(desc, S_SMALL),
    ]]]
    ms_t = Table(ms_data, colWidths=[half_w - 4*mm])
    ms_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('BOX', (0, 0), (-1, -1), 0.5, bdr),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    right4.append(ms_t)
    right4.append(Spacer(1, 2*mm))

main_4 = Table([[left4, right4]], colWidths=[half_w, half_w])
main_4.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (0, 0), 0), ('RIGHTPADDING', (0, 0), (0, 0), 3),
    ('LEFTPADDING', (1, 0), (1, 0), 3), ('RIGHTPADDING', (1, 0), (1, 0), 0),
]))
story.append(main_4)
story.append(Spacer(1, 5*mm))

# Closing box
close_data = [[
    [
        Paragraph('<b>FlowForge</b>', make_style('CL', fontSize=14, textColor=white, bold=True, alignment=TA_CENTER, spaceAfter=4)),
        Paragraph('<b>The future of software delivery starts here.</b>',
                  make_style('CL2', fontSize=13, textColor=white, bold=True, alignment=TA_CENTER, spaceAfter=4)),
        Paragraph('Not another project management tool — the platform that makes engineering teams superhuman.',
                  make_style('CL3', fontSize=9, textColor=HexColor('#94A3B8'), alignment=TA_CENTER, leading=12, spaceAfter=8)),
        Paragraph('flowforge.dev  |  team@flowforge.dev  |  github.com/flowforge',
                  make_style('CL4', fontSize=9, textColor=ACCENT_LIGHT, alignment=TA_CENTER)),
    ]
]]
close_t = Table(close_data, colWidths=[content_width])
close_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), DARK),
    ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ('LEFTPADDING', (0, 0), (-1, -1), 20),
    ('RIGHTPADDING', (0, 0), (-1, -1), 20),
    ('TOPPADDING', (0, 0), (-1, -1), 16),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
]))
story.append(close_t)

story.append(Spacer(1, 4*mm))
story.append(footer_block(4))

# ── Build PDF ──
doc.build(story)
print(f'PDF saved: {output_path}')
