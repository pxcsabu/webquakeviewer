import { Unzip, UnzipInflate, unzipSync } from 'fflate';
import {
  parseAxisList,
  type VelocityAxes,
  type VelocityModel,
} from '../../domain/geophysics/velocityModel';

interface LoadVelocityRequest {
  file: File;
}

interface WorkerScope {
  postMessage(message: WorkerMessage, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<LoadVelocityRequest>) => void) | null;
}

const workerScope = self as unknown as WorkerScope;

interface WorkerMessage {
  type: 'progress' | 'complete' | 'error';
  parsedRows?: number;
  totalRows?: number;
  model?: VelocityModel;
  message?: string;
}

const CITATION =
  'Matsubara, M., T. Ishiyama, T. No, K. Uehira, M. Mochizuki, T. Kanazawa, N. Takahashi, and S. Kamiya (2022), Seismic velocity structure along the Sea of Japan with large events derived from seismic tomography for whole Japanese Islands including reflection survey data and NIED MOWLAS Hi-net and S-net data, Earth, Planets and Space 74:171.';
const DOI = 'https://doi.org/10.1186/s40623-022-01724-0';
const USAGE_NOTE =
  'NIED Hi-net ALJ2023 model. Data are not redistributed. Cite Matsubara et al. (2022). Do not redistribute the data or processed model outputs.';

function post(message: WorkerMessage, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}


function readMetadata(zipBytes: Uint8Array): Map<string, string> {
  const selected = unzipSync(zipBytes, {
    filter: (file) => {
      const base = file.name.split('/').pop() ?? file.name;
      return ['LON.lst', 'LAT.lst', 'DEP.lst'].includes(base);
    },
  });
  const decoder = new TextDecoder();
  const metadata = new Map<string, string>();
  Object.entries(selected).forEach(([path, bytes]) => {
    const base = path.split('/').pop() ?? path;
    metadata.set(base, decoder.decode(bytes));
  });
  return metadata;
}

function parseVelocityData(
  zipBytes: Uint8Array,
  axes: VelocityAxes,
): Promise<{
  vp: Float32Array;
  vs: Float32Array;
  relP: Float32Array;
  relS: Float32Array;
}> {
  return new Promise((resolve, reject) => {
    const expected = axes.lonCount * axes.latCount * axes.depthCount;
    const vp = new Float32Array(expected);
    const vs = new Float32Array(expected);
    const relP = new Float32Array(expected);
    const relS = new Float32Array(expected);
    let row = 0;
    let leftover = '';
    let found = false;
    let settled = false;

    const fail = (error: unknown): void => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    const parseLine = (line: string): void => {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        return;
      }
      const parts = trimmed.split(/\s+/);
      if (parts.length < 7) {
        throw new Error(`VEL.dat の列数が不足しています（行 ${row + 1}）。`);
      }
      if (row >= expected) {
        throw new Error('VEL.dat の行数がグリッド数より多すぎます。');
      }
      const vpValue = Number(parts[3]);
      const vsValue = Number(parts[4]);
      const relPValue = Number(parts[5]);
      const relSValue = Number(parts[6]);
      if (
        !Number.isFinite(vpValue) ||
        !Number.isFinite(vsValue) ||
        !Number.isFinite(relPValue) ||
        !Number.isFinite(relSValue)
      ) {
        throw new Error(`VEL.dat の数値が不正です（行 ${row + 1}）。`);
      }
      vp[row] = vpValue;
      vs[row] = vsValue;
      relP[row] = relPValue;
      relS[row] = relSValue;
      row += 1;
      if (row % 100000 === 0) {
        post({ type: 'progress', parsedRows: row, totalRows: expected });
      }
    };

    const processText = (text: string, final: boolean): void => {
      const combined = leftover + text;
                        const lines = combined.split(/\r?\n/);
      leftover = final ? '' : lines.pop() ?? '';
      lines.forEach(parseLine);
      if (final && leftover.trim().length > 0) {
        parseLine(leftover);
        leftover = '';
      }
    };

    const finish = (): void => {
      if (settled) {
        return;
      }
      try {
        if (!found) {
          throw new Error('ZIP内に VEL.dat が見つかりません。');
        }
        if (row !== expected) {
          throw new Error(
            `VEL.dat の行数が一致しません（${row} / ${expected}）。`,
          );
        }
        post({ type: 'progress', parsedRows: row, totalRows: expected });
        settled = true;
        resolve({ vp, vs, relP, relS });
      } catch (error) {
        fail(error);
      }
    };

    const unzipper = new Unzip((entry) => {
      const base = entry.name.split('/').pop() ?? entry.name;
      if (base !== 'VEL.dat') {
        entry.ondata = () => {};
        return;
      }
      found = true;
      const decoder = new TextDecoder();
      entry.ondata = (error, chunk, final) => {
        if (error) {
          fail(error);
          return;
        }
        try {
          processText(decoder.decode(chunk, { stream: !final }), final);
          if (final) {
            finish();
          }
        } catch (parseError) {
          fail(parseError);
        }
      };
      entry.start();
    });
    unzipper.register(UnzipInflate);
    try {
      unzipper.push(zipBytes, true);
    } catch (error) {
      fail(error);
    }
  });
}

workerScope.onmessage = async (event: MessageEvent<LoadVelocityRequest>) => {
  const { file } = event.data;
  if (!(file instanceof File)) {
    post({ type: 'error', message: 'ZIPファイルを選択してください。' });
    return;
  }
  try {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      post({
        type: 'error',
        message: 'ALJ2023.zip（ZIP形式）を選択してください。',
      });
      return;
    }
    post({ type: 'progress', parsedRows: 0, totalRows: 0 });
    const zipBytes = new Uint8Array(await file.arrayBuffer());
    const metadata = readMetadata(zipBytes);
    const lonText = metadata.get('LON.lst');
    const latText = metadata.get('LAT.lst');
    const depthText = metadata.get('DEP.lst');
    if (lonText === undefined || latText === undefined || depthText === undefined) {
      throw new Error(
        'ZIP内に LON.lst / LAT.lst / DEP.lst が見つかりません。',
      );
    }
    const lons = parseAxisList(lonText);
    const lats = parseAxisList(latText);
    const depths = parseAxisList(depthText);
    if (lons.length === 0 || lats.length === 0 || depths.length === 0) {
      throw new Error('速度構造の座標軸が空です。');
    }
    const axes: VelocityAxes = {
      lons,
      lats,
      depths,
      lonCount: lons.length,
      latCount: lats.length,
      depthCount: depths.length,
    };
    const data = await parseVelocityData(zipBytes, axes);
    const model: VelocityModel = {
      axes,
      ...data,
      source: {
        provider: 'NIED Hi-net',
        dataset: 'ALJ2023 日本列島三次元地震波速度構造',
        fileName: file.name,
        loadedAt: new Date().toISOString(),
        citation: CITATION,
        doi: DOI,
        usageNote: USAGE_NOTE,
        crs: 'UNKNOWN',
      },
      classification: 'MODEL',
    };
    post({ type: 'complete', model }, [
      axes.lons.buffer,
      axes.lats.buffer,
      axes.depths.buffer,
      data.vp.buffer,
      data.vs.buffer,
      data.relP.buffer,
      data.relS.buffer,
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '速度構造の読み込みに失敗しました。';
    post({ type: 'error', message });
  }
};
