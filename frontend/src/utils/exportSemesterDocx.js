import {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  VerticalAlign,
  PageOrientation,
} from 'docx'

const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
  left: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
  right: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
}

const HEADER_FILL = 'F2F2F2'
const RECESS_FILL = 'E8F0FE'
const EXAM_FILL = 'FDE8E8'

const parseDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const shortDate = (dateStr) => {
  const d = parseDate(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// Keep the app's own label as-is, e.g. "Week 1", "Recess", "Exam Week"
const weekNumberLabel = (weekLabel) => weekLabel

function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: HEADER_FILL },
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18 })],
      }),
    ],
  })
}

function weekCell(semWeek, widthPct) {
  const fill =
    semWeek.weekType === 'RECESS' ? RECESS_FILL : semWeek.weekType === 'EXAM' ? EXAM_FILL : 'FFFFFF'
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill },
    verticalAlign: VerticalAlign.TOP,
    borders: CELL_BORDER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: weekNumberLabel(semWeek.weekLabel), bold: true, size: 18 })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `(${shortDate(semWeek.startDate)})`, size: 16, color: '666666' })],
      }),
    ],
  })
}

function taskCell(cellTasks, td, fill, widthPct) {
  const paragraphs =
    cellTasks.length === 0
      ? [new Paragraph({ children: [new TextRun({ text: '', size: 18 })] })]
      : cellTasks.map((task, i) => {
          const parts = [task.title]
          if (td.weightage && task.weightage) parts.push(`(${task.weightage}%)`)
          let dateSuffix = ''
          if (td.dueDate && task.dueDate) {
            dateSuffix = ` — ${shortDate(task.dueDate)}`
            if (td.dueTime && task.dueTime) dateSuffix += ` ${task.dueTime.slice(0, 5)}`
          }
          return new Paragraph({
            spacing: i > 0 ? { before: 60 } : undefined,
            children: [
              new TextRun({ text: parts.join(' '), size: 18 }),
              new TextRun({ text: dateSuffix, size: 16, color: '666666' }),
              task.status === 'COMPLETED' ? new TextRun({ text: '  ✓', size: 16, color: '2E7D32' }) : new TextRun({ text: '' }),
            ],
          })
        })

  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill },
    verticalAlign: VerticalAlign.TOP,
    borders: CELL_BORDER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: paragraphs,
  })
}

/**
 * Builds and downloads a .docx version of the semester table — same week x module
 * grid as the "Save PDF" print view, laid out like a consolidated assessment schedule.
 */
export async function exportSemesterWord({ semesterWeeks, modules, tasks, td }) {
  const weekColPct = 10
  const modColPct = modules.length > 0 ? (100 - weekColPct) / modules.length : 100 - weekColPct

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Wk', weekColPct),
      ...modules.map((mod) => headerCell(mod, modColPct)),
    ],
  })

  const bodyRows = semesterWeeks.map((semWeek) => {
    const start = parseDate(semWeek.startDate)
    const end = parseDate(semWeek.endDate)
    const rowFill =
      semWeek.weekType === 'RECESS' ? RECESS_FILL : semWeek.weekType === 'EXAM' ? EXAM_FILL : 'FFFFFF'

    return new TableRow({
      cantSplit: true,
      children: [
        weekCell(semWeek, weekColPct),
        ...modules.map((mod) => {
          const cellTasks = tasks
            .filter((task) => {
              if (task.moduleCode !== mod || !task.dueDate) return false
              const due = parseDate(task.dueDate)
              return due >= start && due <= end
            })
            .sort((a, b) => parseDate(a.dueDate) - parseDate(b.dueDate))
          return taskCell(cellTasks, td, rowFill, modColPct)
        }),
      ],
    })
  })

  // Undated tasks, one trailing row (mirrors the "No date" row in the print view)
  const hasUndated = modules.some((mod) => tasks.some((t) => t.moduleCode === mod && !t.dueDate))
  if (hasUndated) {
    bodyRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: weekColPct, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'FAFAFA' },
            borders: CELL_BORDER,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'No date', italics: true, size: 16, color: '888888' })] })],
          }),
          ...modules.map((mod) => {
            const undated = tasks.filter((t) => t.moduleCode === mod && !t.dueDate)
            return taskCell(undated, td, 'FAFAFA', modColPct)
          }),
        ],
      })
    )
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 560, right: 560 },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Consolidated Assessment Schedule', bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'track-semester-schedule.docx'
  a.click()
  URL.revokeObjectURL(url)
}