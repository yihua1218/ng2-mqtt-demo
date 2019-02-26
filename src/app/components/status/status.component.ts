import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { EmitterService } from '../../services/emitter';
import { TransportState } from "../../services/mqtt/transport.service";

/**
 * MQ connection status as a component
 */
@Component({
  selector: 'app-mq-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.css']
})
export class StatusComponent implements OnInit {

  public state: Observable<string>;

  constructor(private _emService: EmitterService) { }

  ngOnInit() {
    console.log('Status init');
    this.state = this._emService.state
      .map((state: number) => TransportState[state]);
  }

}
