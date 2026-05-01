import { NextRequest, NextResponse } from 'next/server';
import { contentAgent } from '@/services/content-agent';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;

    const contentQueue = await contentAgent.getContentQueue(status);

    return NextResponse.json({
      success: true,
      data: contentQueue,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, action, reason } = body;

    if (!contentId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contentId, action' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      await contentAgent.approveContent(contentId);
      return NextResponse.json({
        success: true,
        message: 'Content approved successfully',
      });
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      await contentAgent.rejectContent(contentId, reason);
      return NextResponse.json({
        success: true,
        message: 'Content rejected successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}