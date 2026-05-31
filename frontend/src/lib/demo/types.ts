export type DemoActionType = 
  | 'moveCursor' 
  | 'spotlight' 
  | 'bubble' 
  | 'typeText' 
  | 'wait' 
  | 'fakeState' 
  | 'clickPulse'
  | 'hideSpotlight'
  | 'hideBubble';

export interface DemoAction {
  type: DemoActionType;
  /**
   * The element to target, located via data-demo-id="[targetDemoId]"
   */
  targetDemoId?: string;
  
  /**
   * Text to type (for typeText) or display (for bubble)
   */
  text?: string;
  
  /**
   * Duration in milliseconds. The engine waits this long before proceeding to the next action.
   */
  durationMs?: number;
  
  /**
   * Payload for fakeState actions.
   */
  statePayload?: any;
}

export interface DemoConfig {
  speedMultiplier: number;
}
