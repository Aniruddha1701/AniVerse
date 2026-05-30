import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const streamUrl = searchParams.get('url');

    if (!streamUrl) {
      return NextResponse.json({ success: false, message: 'URL is required.' }, { status: 400 });
    }

    let vlcPath = '';

    if (process.platform === 'win32') {
      const paths = [
        'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
        'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'VideoLAN', 'VLC', 'vlc.exe'),
        path.join(
          process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
          'VideoLAN',
          'VLC',
          'vlc.exe'
        ),
      ];

      for (const p of paths) {
        if (fs.existsSync(p)) {
          vlcPath = p;
          break;
        }
      }

      if (!vlcPath) {
        vlcPath = 'vlc';
      }
    } else if (process.platform === 'darwin') {
      const p = '/Applications/VLC.app/Contents/MacOS/VLC';
      if (fs.existsSync(p)) {
        vlcPath = p;
      } else {
        vlcPath = 'vlc';
      }
    } else {
      vlcPath = 'vlc';
    }

    console.log(`[VLC Launcher API] Spawning VLC process: "${vlcPath}" for URL: ${streamUrl}`);

    const child = spawn(vlcPath, [streamUrl], {
      detached: true,
      stdio: 'ignore',
    });

    child.on('error', (spawnErr) => {
      console.error(`[VLC Launcher API Warning] Failed to spawn VLC:`, spawnErr.message);
    });

    child.unref();

    return NextResponse.json({ success: true, message: 'VLC launched successfully.' });
  } catch (err) {
    console.error(`[VLC Launcher API Error]:`, (err as Error).message);
    return NextResponse.json(
      { success: false, message: `Failed to launch VLC: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
