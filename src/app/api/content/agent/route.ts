import { NextRequest, NextResponse } from 'next/server';
import { contentAgent } from '@/services/content-agent';

export async function GET() {
  try {
    const status = contentAgent.getStatus();
    const recentRuns = await contentAgent.getRecentRuns(5);
    
    return NextResponse.json({
      success: true,
      data: {
        status,
        recentRuns,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      await contentAgent.start();
      return NextResponse.json({
        success: true,
        message: 'Content agent started',
      });
    }

    if (action === 'stop') {
      await contentAgent.stop();
      return NextResponse.json({
        success: true,
        message: 'Content agent stopped',
      });
    }

    if (action === 'trigger') {
      const result = await contentAgent.triggerRun();
      return NextResponse.json({
        success: true,
        message: 'Content aggregation triggered',
        data: result,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}