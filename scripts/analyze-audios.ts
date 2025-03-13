import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { exit } from 'node:process';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PATH_ROOT = path.resolve(__dirname, '../');
const PATH_AUDIO = path.resolve(PATH_ROOT, 'assets/audios/j/');

const audioFilenames = fs.readdirSync(PATH_AUDIO).filter((audioPath) => audioPath.endsWith('.mp3'));
console.log('audioFilenames :>> ', audioFilenames);

let allDur = 0;
const audioDurations = audioFilenames.reduce((res, audioFilename) => {
  const duration = getAudioDuration(path.resolve(PATH_AUDIO, audioFilename));
  console.log(`"${audioFilename}": ${duration}`);
  if (duration === -1)
    return process.exit(1);

  res[audioFilename] = duration;
  return res;
}, {});

console.log('audioDurations :>> ', audioDurations);

writeJson(audioDurations, path.resolve(PATH_AUDIO, 'audios.json'));

function getAudioDuration (audioPath: string): number {
  const duration = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ]);

  const err = duration.stderr.toString().trim();
  if (err) {
    console.error('Error :>> ', err);
    return -1;
  }

  return parseFloat(duration.stdout.toString().trim());
}

function writeJson (data: any, outputPath: string) {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}