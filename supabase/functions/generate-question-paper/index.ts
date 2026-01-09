import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  console.log("Request: ", req);
  
  console.log("Method:", req.method)
console.log("Content-Type:", req.headers.get("content-type"))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create client with SERVICE ROLE key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)
    if (authError ) {
  const errorMessage = await authError.context.json()
  console.log('Function returned an error', errorMessage)
}
    if (authError || !user) {
      return new Response(JSON.stringify({ error: `Auth failed: ${authError?.message || 'Invalid token'}` }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

   if (req.method !== 'POST') {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

let exam_id: string

try {
  const body = await req.json()
  exam_id = body.exam_id
} catch {
  return new Response(
    JSON.stringify({ error: 'Invalid or missing JSON body' }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

if (!exam_id) {
  return new Response(
    JSON.stringify({ error: 'exam_id is required' }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

    

    // Fetch exam details
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', exam_id)
      .single()

    if (examError || !exam) {
      return new Response(JSON.stringify({ error: 'Exam not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch exam questions ordered by order_index
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('exam_id', exam_id)
      .order('order_index')

    if (questionsError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let page = pdfDoc.addPage([595, 842]) // A4 size
    let yPosition = 800
    const margin = 50
    const pageWidth = 595 - 2 * margin

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition - requiredHeight < 50) {
        page = pdfDoc.addPage([595, 842])
        yPosition = 800
      }
    }

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, fontSize: number) => {
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const textWidth = font.widthOfTextAtSize(testLine, fontSize)
        
        if (textWidth <= maxWidth) {
          currentLine = testLine
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = word
        }
      }
      if (currentLine) lines.push(currentLine)
      return lines
    }

    // Header
    page.drawText('EXAMINATION QUESTION PAPER', {
      x: margin,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0)
    })
    yPosition -= 40

    // Exam details
    page.drawText(`Exam: ${exam.name}`, {
      x: margin,
      y: yPosition,
      size: 14,
      font: boldFont
    })
    yPosition -= 25

    page.drawText(`Code: ${exam.code}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: font
    })
    yPosition -= 20

    page.drawText(`Duration: ${exam.duration_minutes} minutes`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: font
    })
    yPosition -= 20

    page.drawText(`Total Questions: ${exam.total_questions}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: font
    })
    yPosition -= 20

    page.drawText(`Marks per Question: ${exam.marks_per_question}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: font
    })
    yPosition -= 20

    page.drawText(`Negative Marks: ${exam.negative_marks}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: font
    })
    yPosition -= 40

    // Instructions
    page.drawText('INSTRUCTIONS:', {
      x: margin,
      y: yPosition,
      size: 14,
      font: boldFont
    })
    yPosition -= 25

    const instructions = [
      '1. Read all questions carefully before answering.',
      '2. Each question carries equal marks.',
      '3. There is negative marking for wrong answers.',
      '4. Choose the most appropriate answer.',
      '5. Fill the OMR sheet carefully.'
    ]

    instructions.forEach(instruction => {
      page.drawText(instruction, {
        x: margin,
        y: yPosition,
        size: 10,
        font: font
      })
      yPosition -= 18
    })
    yPosition -= 30

    // Questions
    questions.forEach((question, index) => {
      checkPageBreak(120) // Minimum space needed for a question

      // Question number and text
      const questionHeader = `Q${index + 1}.`
      page.drawText(questionHeader, {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont
      })

      const questionLines = wrapText(question.question_text, pageWidth - 40, 12)
      questionLines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: margin + (lineIndex === 0 ? 30 : 0),
          y: yPosition - (lineIndex * 15),
          size: 12,
          font: font
        })
      })
      yPosition -= (questionLines.length * 15) + 10

      // Options
      const options = [
        { key: 'A', text: question.option_a },
        { key: 'B', text: question.option_b },
        { key: 'C', text: question.option_c },
        { key: 'D', text: question.option_d }
      ]

      options.forEach(option => {
        checkPageBreak(20)
        const optionLines = wrapText(`(${option.key}) ${option.text}`, pageWidth - 60, 11)
        optionLines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x: margin + 20,
            y: yPosition - (lineIndex * 14),
            size: 11,
            font: font
          })
        })
        yPosition -= (optionLines.length * 14) + 5
      })
      yPosition -= 20
    })

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${exam.name}_Question_Paper.pdf"`
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})