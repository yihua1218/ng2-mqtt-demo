import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';

import { MQTTService } from '../mqtt/mqtt.service';

@Injectable()
export class EmitterService extends MQTTService {

  constructor(@Inject(DOCUMENT) private __document: any) {
    super(__document);
  }

}
