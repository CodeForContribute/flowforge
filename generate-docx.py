#!/usr/bin/env python3
"""Generate FlowForge investor pitch deck as a Word document."""

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import os

doc = Document()

# ── Styles & Defaults ──
style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(10)
font.color.rgb = RGBColor(0x47, 0x55, 0x69)

# Page margins
for section in doc.sections:
    section.top_margin = Cm(1.5)
    section.bottom_margin = Cm(1.5)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)

ACCENT = RGBColor(0x63, 0x66, 0xF1)
DARK = RGBColor(0x0F, 0x17, 0x2A)
MUTED = RGBColor(0x47, 0x55, 0x69)
SUCCESS = RGBColor(0x10, 0xB9, 0x81)
RED = RGBColor(0xB9, 0x1C, 0x1C)
ORANGE = RGBColor(0x92, 0x40, 0x0E)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BG = RGBColor(0xF8, 0xFA, 0xFC)


def add_heading_styled(text, level=1, color=DARK, space_before=0, space_after=6):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.space_before = Pt(space_before)
    h.paragraph_format.space_after = Pt(space_after)
    for run in h.runs:
        run.font.color.rgb = color
        run.font.name = 'Calibri'
    return h


def add_para(text, bold=False, color=MUTED, size=10, space_after=4, align=None):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.name = 'Calibri'
    run.bold = bold
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(0)
    if align:
        p.alignment = align
    return p


def add_section_label(text):
    p = doc.add_paragraph()
    run = p.add_run(text.upper())
    run.font.size = Pt(8)
    run.font.color.rgb = ACCENT
    run.font.name = 'Calibri'
    run.bold = True
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(12)
    return p


def add_bullet(text, color=MUTED, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        run_b = p.add_run(bold_prefix)
        run_b.bold = True
        run_b.font.size = Pt(10)
        run_b.font.color.rgb = DARK
        run_b.font.name = 'Calibri'
        run = p.add_run(text)
    else:
        run = p.add_run(text)
    run.font.size = Pt(10)
    run.font.color.rgb = color
    run.font.name = 'Calibri'
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(0)
    return p


def shade_cell(cell, color_hex):
    """Apply background shading to a table cell."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_text(cell, text, bold=False, color=MUTED, size=9, align=None):
    cell.text = ''
    p = cell.paragraphs[0]
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.name = 'Calibri'
    run.bold = bold
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.space_before = Pt(1)
    if align:
        p.alignment = align


def add_line():
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    # Add a horizontal border
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        '  <w:bottom w:val="single" w:sz="4" w:space="1" w:color="E2E8F0"/>'
        '</w:pBdr>'
    )
    pPr.append(pBdr)


# ════════════════════════════════════════════════════════════════════════════
# PAGE 1 — COVER + PROBLEM + SOLUTION
# ════════════════════════════════════════════════════════════════════════════

# Header
p = doc.add_paragraph()
run = p.add_run('FlowForge')
run.font.size = Pt(16)
run.font.bold = True
run.font.color.rgb = DARK
run.font.name = 'Calibri'
run2 = p.add_run('    Confidential  |  Seed Round  |  March 2026')
run2.font.size = Pt(8)
run2.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
run2.font.name = 'Calibri'
p.paragraph_format.space_after = Pt(4)

add_line()

# Hero
add_heading_styled('Ship Software Faster with AI-Powered Project Management', level=1, space_before=8)
add_para(
    'The first PM platform that doesn\'t just track work \u2014 it does the work. '
    'AI code generation, GitHub integration, and smart sprint planning in one workflow.',
    size=11, space_after=2
)
add_para('Raising \u20b920 Cr (~$2.5M) Seed Round', bold=True, color=ACCENT, size=11, space_after=10)

# Problem
add_section_label('The Problem')
add_heading_styled('Engineering teams lose 23% of their time to tooling overhead', level=2, space_after=6)

prob_table = doc.add_table(rows=1, cols=3)
prob_table.alignment = WD_TABLE_ALIGNMENT.CENTER
for i, (title, desc) in enumerate([
    ('Tool Fragmentation', 'Teams juggle 5-7 tools \u2014 Jira, GitHub, Slack, CI/CD \u2014 losing hours daily to context switching.'),
    ('Slow PR Cycles', 'Average PR sits open 4.5 days. Code reviews bottleneck delivery. Junior devs wait days for feedback.'),
    ('Planning Theater', 'Sprint planning takes hours, estimates are guesswork, retrospectives produce the same action items.'),
]):
    cell = prob_table.cell(0, i)
    shade_cell(cell, 'FEF2F2')
    p = cell.paragraphs[0]
    run = p.add_run(title + '\n')
    run.bold = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x99, 0x1B, 0x1B)
    run.font.name = 'Calibri'
    run2 = p.add_run(desc)
    run2.font.size = Pt(8.5)
    run2.font.color.rgb = RED
    run2.font.name = 'Calibri'
    p.paragraph_format.space_after = Pt(4)

add_line()

# Solution
add_section_label('The Solution')
add_heading_styled('One platform that plans, codes, reviews, and ships', level=2, space_after=4)
add_para(
    'FlowForge replaces the fragmented toolchain with an AI-native workflow automating '
    'the entire SDLC \u2014 from task creation to merged PR.',
    space_after=6
)

# Flow diagram as text
flow_p = doc.add_paragraph()
flow_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
flow_p.paragraph_format.space_after = Pt(8)
for i, (icon, label) in enumerate([
    ('\U0001f4dd', 'Create Task'), ('\U0001f916', 'AI Codes'), ('\U0001f440', 'Human Reviews'),
    ('\U0001f4ac', 'AI Responds'), ('\U0001f680', 'Ship It'),
]):
    if i > 0:
        arrow = flow_p.add_run('  \u2192  ')
        arrow.font.size = Pt(11)
        arrow.font.color.rgb = RGBColor(0xC7, 0xD2, 0xFE)
    run = flow_p.add_run(f'{icon} {label}')
    run.font.size = Pt(10)
    run.font.color.rgb = ACCENT
    run.font.name = 'Calibri'
    run.bold = True

# Feature grid
feat_table = doc.add_table(rows=2, cols=2)
feat_table.alignment = WD_TABLE_ALIGNMENT.CENTER
features = [
    ('AI Code Generation', 'Generates production-ready code from task descriptions \u2014 including tests, error handling, and PR creation. Supports OpenAI GPT-4o and Anthropic Claude.'),
    ('Deep GitHub Integration', 'Auto-creates branches and PRs, processes webhooks in real-time, tracks CI/CD status, and syncs bidirectionally with repositories.'),
    ('AI Sprint Planning', 'Intelligent story point estimation, risk assessment, dependency detection, and automatic retrospective generation from sprint data.'),
    ('Smart Review Handling', 'AI classifies review comments as code changes vs. discussions, generates contextual responses, and updates code based on feedback.'),
]
for idx, (title, desc) in enumerate(features):
    cell = feat_table.cell(idx // 2, idx % 2)
    shade_cell(cell, 'F8FAFC')
    p = cell.paragraphs[0]
    run = p.add_run(title + '\n')
    run.bold = True
    run.font.size = Pt(9)
    run.font.color.rgb = DARK
    run.font.name = 'Calibri'
    run2 = p.add_run(desc)
    run2.font.size = Pt(8.5)
    run2.font.color.rgb = MUTED
    run2.font.name = 'Calibri'
    p.paragraph_format.space_after = Pt(4)

# Footer
add_para('\nFlowForge \u2014 Confidential                                                                                                          Page 1 of 4',
         size=8, color=RGBColor(0x94, 0xA3, 0xB8), space_after=0)

# Page break
doc.add_page_break()

# ════════════════════════════════════════════════════════════════════════════
# PAGE 2 — MARKET + COMPETITION + INDIA ANGLE
# ════════════════════════════════════════════════════════════════════════════

p = doc.add_paragraph()
run = p.add_run('FlowForge')
run.font.size = Pt(16)
run.font.bold = True
run.font.color.rgb = DARK
run.font.name = 'Calibri'
run2 = p.add_run('    Market Opportunity & Competitive Landscape')
run2.font.size = Pt(8)
run2.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
run2.font.name = 'Calibri'
p.paragraph_format.space_after = Pt(4)
add_line()

add_section_label('Market Opportunity')
add_heading_styled('A massive global market \u2014 with India as a unique wedge', level=2, space_after=6)

# Market stats
mkt_table = doc.add_table(rows=1, cols=4)
mkt_table.alignment = WD_TABLE_ALIGNMENT.CENTER
stats = [
    ('$85B', 'Project Mgmt\nTAM (Global)'),
    ('$22B', 'Developer Tools\nSAM'),
    ('$4.5B', 'AI-Powered DevTools\nSOM (Target)'),
    ('28M+', 'Professional\nDevelopers'),
]
for i, (num, label) in enumerate(stats):
    cell = mkt_table.cell(0, i)
    shade_cell(cell, 'F8FAFC')
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(num + '\n')
    run.font.size = Pt(18)
    run.font.bold = True
    run.font.color.rgb = ACCENT
    run.font.name = 'Calibri'
    run2 = p.add_run(label)
    run2.font.size = Pt(8)
    run2.font.color.rgb = MUTED
    run2.font.name = 'Calibri'
    p.paragraph_format.space_after = Pt(4)

# India Advantage callout
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(10)
p.paragraph_format.space_after = Pt(4)
# Shade the paragraph via a single-cell table
india_table = doc.add_table(rows=1, cols=1)
cell = india_table.cell(0, 0)
shade_cell(cell, 'FEF3C7')
p = cell.paragraphs[0]
run = p.add_run('India Advantage\n')
run.bold = True
run.font.size = Pt(10)
run.font.color.rgb = ORANGE
run.font.name = 'Calibri'
run2 = p.add_run(
    'India has 5.8M+ developers (2nd largest globally) and 1,600+ GCCs employing 1.9M+ tech professionals. '
    'Indian IT services ($250B+) are under pressure to adopt AI-native tooling. FlowForge is built in India '
    'with 3-4x capital efficiency vs. US peers \u2014 the same playbook that built Freshworks ($12B), '
    'Postman ($5.6B), and Zoho into global SaaS leaders. Our target: land with India\u2019s fast-growing '
    'startup ecosystem, then expand globally via GitHub\u2019s developer network.'
)
run2.font.size = Pt(9)
run2.font.color.rgb = RGBColor(0xB4, 0x53, 0x09)
run2.font.name = 'Calibri'
p.paragraph_format.space_after = Pt(4)

# Target Customers
add_section_label('Target Customers')
add_bullet('5-50 person engineering teams on GitHub (India + Global). Fast AI adopters. ACV: \u20b950K-3L/yr.', bold_prefix='Primary \u2014 Startups & SMBs: ')
add_bullet('50-500 engineers in India\u2019s 1,600+ GCCs consolidating tools. ACV: \u20b940L-1.5Cr/yr.', bold_prefix='Secondary \u2014 GCCs & Mid-Market: ')
add_bullet('Large-scale deployments with SSO, on-prem, SLA guarantees. ACV: \u20b91.5Cr+/yr.', bold_prefix='Expansion \u2014 Enterprise / IT Services: ')

# Why Now
why_table = doc.add_table(rows=1, cols=1)
cell = why_table.cell(0, 0)
shade_cell(cell, 'EEF2FF')
p = cell.paragraphs[0]
run = p.add_run('Why Now? ')
run.bold = True
run.font.size = Pt(9)
run.font.color.rgb = ACCENT
run.font.name = 'Calibri'
run2 = p.add_run(
    'LLMs crossed the production-code-quality threshold in 2025. AI coding tools (Copilot, Cursor) '
    'normalized AI-assisted development. But no tool connects task management \u2192 code generation \u2192 '
    'review \u2192 deployment. FlowForge is first to close this loop.'
)
run2.font.size = Pt(9)
run2.font.color.rgb = MUTED
run2.font.name = 'Calibri'

# Competitive Landscape
add_section_label('Competitive Landscape')
add_heading_styled('The only platform that closes the loop', level=2, space_after=4)

comp_table = doc.add_table(rows=9, cols=5)
comp_table.alignment = WD_TABLE_ALIGNMENT.CENTER
comp_table.style = 'Table Grid'

headers = ['Capability', 'FlowForge', 'Jira', 'Linear', 'Copilot']
for i, h in enumerate(headers):
    cell = comp_table.cell(0, i)
    set_cell_text(cell, h, bold=True, color=ACCENT if i == 1 else MUTED, size=8)
    if i == 1:
        shade_cell(cell, 'EEF2FF')

rows_data = [
    ('Task & Sprint Mgmt', '\u2713 Full', '\u2713 Full', '\u2713 Full', '\u2717'),
    ('AI Code Generation', '\u2713 Full', '\u2717', '\u2717', 'Inline'),
    ('Auto PR Creation', '\u2713 Full', '\u2717', '\u2717', '\u2717'),
    ('AI Review Response', '\u2713 Full', '\u2717', '\u2717', '\u2717'),
    ('AI Sprint Planning', '\u2713 Full', '\u2717', '\u2717', '\u2717'),
    ('GitHub Integration', '\u2713 Native', 'Plugin', '\u2713 Good', '\u2713 Native'),
    ('Task\u2192Code\u2192PR Loop', '\u2713 E2E', '\u2717', '\u2717', '\u2717'),
    ('Multi AI Provider', '\u2713 2', '\u2717', '\u2717', '\u2717'),
]
for r, row_data in enumerate(rows_data):
    for c, val in enumerate(row_data):
        cell = comp_table.cell(r + 1, c)
        is_check = val.startswith('\u2713')
        is_cross = val == '\u2717'
        clr = SUCCESS if is_check else (RGBColor(0xCB, 0xD5, 0xE1) if is_cross else MUTED)
        set_cell_text(cell, val, bold=(c == 0 or is_check), color=DARK if c == 0 else clr, size=8)
        if c == 1:
            shade_cell(cell, 'EEF2FF')

# Moat
moat_table = doc.add_table(rows=1, cols=1)
cell = moat_table.cell(0, 0)
shade_cell(cell, 'EEF2FF')
p = cell.paragraphs[0]
run = p.add_run('Moat: Data Flywheel \u2014 ')
run.bold = True
run.font.size = Pt(9)
run.font.color.rgb = ACCENT
run.font.name = 'Calibri'
run2 = p.add_run(
    'Every AI execution improves code quality, review accuracy, and estimation precision. '
    'The task\u2192PR pipeline creates compounding data advantages that competitors can\'t replicate '
    'without rebuilding both PM and AI layers.'
)
run2.font.size = Pt(9)
run2.font.color.rgb = MUTED
run2.font.name = 'Calibri'

add_para('\nFlowForge \u2014 Confidential                                                                                                          Page 2 of 4',
         size=8, color=RGBColor(0x94, 0xA3, 0xB8), space_after=0)

doc.add_page_break()

# ════════════════════════════════════════════════════════════════════════════
# PAGE 3 — BUSINESS MODEL + TRACTION + ROADMAP
# ════════════════════════════════════════════════════════════════════════════

p = doc.add_paragraph()
run = p.add_run('FlowForge')
run.font.size = Pt(16)
run.font.bold = True
run.font.color.rgb = DARK
run.font.name = 'Calibri'
run2 = p.add_run('    Business Model, Traction & Roadmap')
run2.font.size = Pt(8)
run2.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
run2.font.name = 'Calibri'
p.paragraph_format.space_after = Pt(4)
add_line()

# Business Model
add_section_label('Business Model')
add_heading_styled('SaaS + Usage-Based AI Upside', level=2, space_after=6)

# Pricing table
price_table = doc.add_table(rows=5, cols=3)
price_table.alignment = WD_TABLE_ALIGNMENT.CENTER
price_table.style = 'Table Grid'

tiers = [
    ('FREE', '\u20b90', ['Up to 3 projects', 'GitHub integration', 'Basic AI suggestions']),
    ('PRO (Recommended)', '\u20b9999/user/mo', ['Unlimited projects', 'Advanced AI generation', 'Sprint analytics', 'Priority support']),
    ('ENTERPRISE', 'Custom', ['SSO / SAML', 'On-premise deploy', 'Custom integrations', 'SLA guarantees']),
]
for col, (tier, price, features) in enumerate(tiers):
    set_cell_text(price_table.cell(0, col), tier, bold=True, color=ACCENT, size=8)
    set_cell_text(price_table.cell(1, col), price, bold=True, color=DARK, size=14)
    for row_idx, feat in enumerate(features):
        if row_idx + 2 < 5:
            set_cell_text(price_table.cell(row_idx + 2, col), '\u2713 ' + feat, color=MUTED, size=8)
    if col == 1:
        for r in range(5):
            shade_cell(price_table.cell(r, col), 'EEF2FF')

add_para(
    'Revenue drivers: Seat-based SaaS (predictable MRR) + AI execution credits '
    '(usage upside) + Enterprise annual contracts.',
    size=9, space_after=6
)

# Unit Economics
add_section_label('Target Unit Economics')
econ_table = doc.add_table(rows=6, cols=2)
econ_table.alignment = WD_TABLE_ALIGNMENT.CENTER
metrics = [
    ('LTV (per seat)', '\u20b92.4L ($2,880)'),
    ('CAC', '\u20b926K ($320)'),
    ('LTV:CAC Ratio', '9:1'),
    ('Gross Margin', '78%'),
    ('Net Revenue Retention', '125%'),
    ('Payback Period', '4 months'),
]
for i, (label, val) in enumerate(metrics):
    set_cell_text(econ_table.cell(i, 0), label, color=MUTED, size=9)
    clr = ACCENT if 'LTV:CAC' in label else DARK
    set_cell_text(econ_table.cell(i, 1), val, bold=True, color=clr, size=9)
    shade_cell(econ_table.cell(i, 0), 'F8FAFC')
    shade_cell(econ_table.cell(i, 1), 'F8FAFC')

# Land & Expand
le_table = doc.add_table(rows=1, cols=1)
cell = le_table.cell(0, 0)
shade_cell(cell, 'F0FDF4')
p = cell.paragraphs[0]
run = p.add_run('Land & Expand: ')
run.bold = True
run.font.size = Pt(9)
run.font.color.rgb = RGBColor(0x06, 0x5F, 0x46)
run.font.name = 'Calibri'
run2 = p.add_run(
    'Free tier drives adoption \u2192 teams upgrade as AI executions prove value \u2192 '
    'average expansion 3x within 6 months. PLG motion keeps CAC low.'
)
run2.font.size = Pt(9)
run2.font.color.rgb = RGBColor(0x04, 0x78, 0x57)
run2.font.name = 'Calibri'

add_line()

# Traction
add_section_label('Traction')
add_heading_styled('Product-First, Capital-Efficient', level=2, space_after=6)

trac_table = doc.add_table(rows=1, cols=4)
trac_table.alignment = WD_TABLE_ALIGNMENT.CENTER
trac_stats = [('295+', 'Source files shipped'), ('50+', 'Features built'), ('15+', 'PRs merged'), ('2', 'AI providers')]
for i, (num, lbl) in enumerate(trac_stats):
    cell = trac_table.cell(0, i)
    shade_cell(cell, 'F8FAFC')
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(num + '\n')
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = ACCENT
    run.font.name = 'Calibri'
    run2 = p.add_run(lbl)
    run2.font.size = Pt(8)
    run2.font.color.rgb = MUTED
    run2.font.name = 'Calibri'

add_bullet('Full Kanban board with drag-and-drop, WIP limits, task hierarchy (Epics \u2192 Subtasks)')
add_bullet('End-to-end AI code generation pipeline with human-in-the-loop review')
add_bullet('Deep GitHub integration \u2014 webhooks, PR management, CI/CD tracking')
add_bullet('AI sprint planning \u2014 risk assessment, dependency detection, auto-retros')
add_bullet('Multi-tenant org support with role-based access control')
add_bullet('Open-source community with organic contributors and feature requests')

add_line()

# Roadmap
add_section_label('Roadmap')
phases = [
    ('\u2713 Phase 1 \u2014 Foundation (Done)', 'Core PM, Kanban, sprints, GitHub integration, AI code generation pipeline'),
    ('\u2192 Phase 2 \u2014 Intelligence (Q2 2026)', 'Advanced analytics, velocity/burndown charts, time tracking, custom dashboards'),
    ('Phase 3 \u2014 Ecosystem (Q3 2026)', 'Slack, GitLab, Jira migration, API marketplace, automation rules'),
    ('Phase 4 \u2014 Enterprise (Q4 2026)', 'SSO/SAML, on-premise, SOC 2, audit logs, advanced RBAC'),
]
for title, desc in phases:
    p = doc.add_paragraph()
    run = p.add_run(title)
    run.bold = True
    run.font.size = Pt(9)
    run.font.color.rgb = DARK
    run.font.name = 'Calibri'
    run2 = p.add_run(' \u2014 ' + desc)
    run2.font.size = Pt(9)
    run2.font.color.rgb = MUTED
    run2.font.name = 'Calibri'
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(0)

add_para('\nFlowForge \u2014 Confidential                                                                                                          Page 3 of 4',
         size=8, color=RGBColor(0x94, 0xA3, 0xB8), space_after=0)

doc.add_page_break()

# ════════════════════════════════════════════════════════════════════════════
# PAGE 4 — THE ASK + MILESTONES + CLOSING
# ════════════════════════════════════════════════════════════════════════════

p = doc.add_paragraph()
run = p.add_run('FlowForge')
run.font.size = Pt(16)
run.font.bold = True
run.font.color.rgb = DARK
run.font.name = 'Calibri'
run2 = p.add_run('    The Ask & Vision')
run2.font.size = Pt(8)
run2.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
run2.font.name = 'Calibri'
p.paragraph_format.space_after = Pt(4)
add_line()

add_section_label('The Ask')
add_heading_styled('Raising \u20b920 Crore (~$2.5M) Seed Round', level=1, space_after=4)
add_para(
    'To accelerate product development, launch publicly, build the go-to-market engine, '
    'and capture the AI-native project management category \u2014 from India, for the world.',
    size=11, space_after=10
)

# Big stats
ask_table = doc.add_table(rows=1, cols=3)
ask_table.alignment = WD_TABLE_ALIGNMENT.CENTER
ask_stats = [
    ('\u20b920 Cr', 'Seed Round (~$2.5M)', 'EEF2FF'),
    ('18 mo', 'Runway to Series A', 'F0FDF4'),
    ('\u20b916 Cr+', 'ARR Target (2027)', 'FFFBEB'),
]
for i, (num, lbl, bg) in enumerate(ask_stats):
    cell = ask_table.cell(0, i)
    shade_cell(cell, bg)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    clrs = [ACCENT, SUCCESS, RGBColor(0xF5, 0x9E, 0x0B)]
    run = p.add_run(num + '\n')
    run.font.size = Pt(20)
    run.font.bold = True
    run.font.color.rgb = clrs[i]
    run.font.name = 'Calibri'
    run2 = p.add_run(lbl)
    run2.font.size = Pt(9)
    run2.font.color.rgb = MUTED
    run2.font.name = 'Calibri'
    p.paragraph_format.space_after = Pt(8)

# Use of Funds
add_section_label('Use of Funds')
funds = [
    ('Engineering (50%)', '\u20b910 Cr', 'Hire 3-4 senior engineers to accelerate roadmap'),
    ('AI Infrastructure (20%)', '\u20b94 Cr', 'API costs, model fine-tuning, execution pipeline'),
    ('Go-to-Market (20%)', '\u20b94 Cr', 'DevRel, content marketing, community building, India GTM'),
    ('Operations (10%)', '\u20b92 Cr', 'Legal, compliance (SOC 2), cloud infrastructure'),
]
funds_table = doc.add_table(rows=4, cols=3)
funds_table.alignment = WD_TABLE_ALIGNMENT.CENTER
funds_table.style = 'Table Grid'
for i, (category, amount, desc) in enumerate(funds):
    set_cell_text(funds_table.cell(i, 0), category, bold=True, color=DARK, size=9)
    set_cell_text(funds_table.cell(i, 1), amount, bold=True, color=ACCENT, size=9)
    set_cell_text(funds_table.cell(i, 2), desc, color=MUTED, size=9)
    shade_cell(funds_table.cell(i, 0), 'F8FAFC')

# Key Milestones
add_section_label('Key Milestones')
milestones = [
    ('Q2 2026 \u2014 Public Beta', 'Open sign-ups, free tier launch, community building. Target: 500 active teams.'),
    ('Q3 2026 \u2014 Revenue Launch', 'Pro tier monetization, GCC outreach, enterprise pilots. Target: \u20b940L MRR.'),
    ('Q4 2026 \u2014 Enterprise Ready', 'SOC 2, SSO/SAML, on-premise option. Target: 3 enterprise contracts.'),
    ('2027 \u2014 Series A Position', '\u20b916 Cr+ ARR, 50+ paying teams, proven unit economics, category leadership.'),
]
for title, desc in milestones:
    p = doc.add_paragraph()
    run = p.add_run(title + ' \u2014 ')
    run.bold = True
    run.font.size = Pt(9)
    run.font.color.rgb = DARK
    run.font.name = 'Calibri'
    run2 = p.add_run(desc)
    run2.font.size = Pt(9)
    run2.font.color.rgb = MUTED
    run2.font.name = 'Calibri'
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.space_before = Pt(0)

add_line()

# Closing
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(16)
run = p.add_run('FlowForge\n')
run.font.size = Pt(18)
run.font.bold = True
run.font.color.rgb = DARK
run.font.name = 'Calibri'

p2 = doc.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p2.add_run('The future of software delivery starts here.')
run.font.size = Pt(14)
run.font.bold = True
run.font.color.rgb = DARK
run.font.name = 'Calibri'
p2.paragraph_format.space_after = Pt(4)

p3 = doc.add_paragraph()
p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p3.add_run('Not another project management tool \u2014 the platform that makes engineering teams superhuman.')
run.font.size = Pt(10)
run.font.color.rgb = MUTED
run.font.name = 'Calibri'
p3.paragraph_format.space_after = Pt(12)

p4 = doc.add_paragraph()
p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
for label in ['flowforge.dev', 'team@flowforge.dev', 'github.com/flowforge']:
    run = p4.add_run(f'  {label}  ')
    run.font.size = Pt(10)
    run.font.color.rgb = ACCENT
    run.font.name = 'Calibri'
    run2 = p4.add_run('  |')
    run2.font.size = Pt(10)
    run2.font.color.rgb = RGBColor(0xE2, 0xE8, 0xF0)
p4.paragraph_format.space_after = Pt(16)

add_para('\nFlowForge \u2014 Confidential                                                                                                          Page 4 of 4',
         size=8, color=RGBColor(0x94, 0xA3, 0xB8), space_after=0)

# ── Save ──
output_path = os.path.join(os.path.dirname(__file__), 'FlowForge-Investor-Deck-India.docx')
doc.save(output_path)
print(f'Saved: {output_path}')
