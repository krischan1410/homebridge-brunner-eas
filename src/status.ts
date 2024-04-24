export type Stage = 'Door open' | 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Glow' | 'Rest' | 'Off';
export type StokeHint = 'Off' | 'Flags' | 'Beep' | 'Arrow'| 'Noisy';

export interface Status {
  extendedBurnOff: boolean;
  eco: boolean;
  displayLightness: number;
  buzzer: number;
  stokeHint: StokeHint;
  dros: boolean;
  vers: string;
  verp: string;
  bits: number;
  temparature: number;
  burnOffStage: Stage;
  lastStageChange?: Date;
  lastTemparatureChange?: Date;
}

const getStage = (value: string): Stage => {
  switch (value) {
    case '0': return 'Door open';
    case '1': return 'Stage 1';
    case '2': return 'Stage 2';
    case '3': return 'Stage 3';
    case '4': return 'Stage 4';
    case '5': return 'Glow';
    case '6': return 'Rest';
    default: return 'Off';
  }
};

const getStokeHint = (value: string): StokeHint => {
  switch (value) {
    case '1': return 'Flags';
    case '2': return 'Beep';
    case '3': return 'Arrow';
    case '4': return 'Noisy';
    default: return 'Off';
  }
};

export const mergeStatus = (status: Status, stage: string, values: string[]): boolean => {
  let somethingChanged = false;

  // '0', '1', '1', '80', '2',  '4',  '0', '331', '2',  '0',  '0', '0', '22', '31', ''
  status.extendedBurnOff = values[0] === '1';  // 0
  status.eco = values[1] === '1'; // 1
  // status.??? = values[2]; // 1
  status.displayLightness = parseInt(values[3]); // 80
  status.buzzer = parseInt(values[4]); // 2
  status.stokeHint = getStokeHint(values[5]); // 4
  status.dros = values[6] === '1'; // 0
  status.vers = values[7]; // 331
  status.verp = values[8]; // 2
  status.bits = ~parseInt(values[9], 2); // 0
  // status.??? = values[10]; // 0
  // status.??? = values[11]; // 0
  const newTemparature = parseInt(values[12]); // 22
  if (status.temparature !== newTemparature) {
    somethingChanged = true;
    status.temparature = newTemparature;
    status.lastTemparatureChange = new Date();
  }
  // status.??? = values[13]; // 31
  // status.??? = values[14]; // <empty>
  if (status.burnOffStage !== getStage(stage)) {
    somethingChanged = true;
    status.burnOffStage = getStage(stage);
    status.lastStageChange = new Date();
  }

  return somethingChanged;
};
