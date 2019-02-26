import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';

import { MQTTService } from '../mqtt/mqtt.service';

@Injectable()
export class EmitterService extends MQTTService {

  constructor(@Inject(DOCUMENT) private __document: any) {
    super(__document);
  }

  subscribe(channel: string) {
    super.subscribe(`${this.config.key}/${channel}`);
  }

  publish(channel: string, message: any) {
    let msg = message;

    if (typeof msg !== 'string') {
      msg = JSON.stringify(message);
    }
    super.publish(`${this.config.key}/${channel}`, msg);
  }
}
