import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const TEST_USER_ID = process.env.DEPLOY_USER_ID ?? 'demo-user'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing workspaces:', error)
      return NextResponse.json(
        { error: `Failed to list workspaces: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ workspaces: data ?? [] })
  } catch (error) {
    console.error('Workspaces GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body as {
      name?: string
      description?: string
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name: name.trim(),
        description: description?.trim() ?? '',
        user_id: TEST_USER_ID,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Error creating workspace:', error)
      return NextResponse.json(
        { error: `Failed to create workspace: ${error?.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ workspace: data }, { status: 201 })
  } catch (error) {
    console.error('Workspaces POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
