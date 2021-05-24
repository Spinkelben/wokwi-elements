import { css, customElement, html, LitElement, property, svg } from 'lit-element';
import { analog, ElementPin } from './pin';
import { clamp } from './utils/clamp';

@customElement('wokwi-slide-potentiometer')
export class SlidePotentiometerElement extends LitElement {
  @property() value = 0;
  @property() min = 0;
  @property() max = 100;
  @property() step = 2;
  readonly pinInfo: ElementPin[] = [
    { name: 'VCC', x: 1, y: 43, number: 1, signals: [{ type: 'power', signal: 'VCC' }] },
    { name: 'SIG', x: 1, y: 66.5, number: 2, signals: [analog(0)] },
    { name: 'GND', x: 207, y: 43, number: 3, signals: [{ type: 'power', signal: 'GND' }] },
  ];
  private isPressed = false;
  private zoom = 1;
  private pageToLocalTransformationMatrix: DOMMatrix | null = null;

  static get styles() {
    return css`
      .hide-input {
        position: absolute;
        clip: rect(0 0 0 0);
        width: 1px;
        height: 1px;
        margin: -1px;
      }
      input:focus + svg #tip {
        /* some style to add when the element has focus */
        filter: url(#outline);
      }
    `;
  }

  render() {
    const { value, min: minValue, max: maxValue } = this;
    const tipTravelInMM = 30;
    // Tip is centered by default
    const tipBaseOffsetX = -(tipTravelInMM / 2);
    const tipMovementX = (value / (maxValue - minValue)) * tipTravelInMM;
    const tipOffSetX = tipMovementX + tipBaseOffsetX;
    return html`
      <input
        tabindex="0"
        type="range"
        min="${this.min}"
        max="${this.max}"
        value="${this.value}"
        step="${this.step}"
        aria-valuemin="${this.min}"
        aria-valuenow="${this.value}"
        aria-valuemax="${this.max}"
        @input="${this.onInputValueChange}"
        class="hide-input"
      />
      <svg
        width="55mm"
        height="29mm"
        version="1.1"
        viewBox="0 0 55 29"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
      >
        <defs>
          <filter id="outline">
            <feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#4faaff" />
          </filter>
          <linearGradient
            id="tipGradient"
            x1="36.482"
            x2="50.447"
            y1="91.25"
            y2="91.25"
            gradientTransform="matrix(.8593 0 0 1.1151 -14.849 -92.256)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#1a1a1a" offset="0" />
            <stop stop-color="#595959" offset=".4" />
            <stop stop-color="#595959" offset=".6" />
            <stop stop-color="#1a1a1a" offset="1" />
          </linearGradient>
          <radialGradient
            id="bodyGradient"
            cx="62.59"
            cy="65.437"
            r="22.5"
            gradientTransform="matrix(1.9295 3.7154e-8 0 .49697 -98.268 -23.02)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#d2d2d2" offset="0" />
            <stop stop-color="#2a2a2a" offset="1" />
          </radialGradient>
          <g id="screw">
            <circle cx="0" cy="0" r="1" fill="#858585" stroke="#000" stroke-width=".05" />
            <path d="m0 1 0-2" fill="none" stroke="#000" stroke-width=".151" />
          </g>
        </defs>
        <!-- pins -->
        <g fill="#ccc">
          <rect x="0" y="11" width="5" height="0.75" />
          <rect x="50" y="11" width="5" height="0.75" />
          <rect x="0" y="17.25" width="5" height="0.75" />
        </g>
        <g transform="translate(5 5)">
          <!-- Body -->
          <rect
            id="sliderCase"
            x="0"
            y="5"
            width="45"
            height="9"
            rx=".2"
            ry=".2"
            fill="url(#bodyGradient)"
            fill-rule="evenodd"
          />
          <rect x="3.25" y="8" width="38.5" height="3" rx=".1" ry=".1" fill="#3f1e1e" />
          <!-- Screw Left -->
          <g transform="translate(1.625 9.5) rotate(45)">
            <use href="#screw" />
          </g>
          <!-- Screw Right -->
          <g transform="translate(43.375 9.5) rotate(45)">
            <use href="#screw" />
          </g>
          <!-- Tip -->
          <g
            id="tip"
            transform="translate(${tipOffSetX} 0)"
            @mousedown=${this.down}
            @touchstart=${this.down}
            @touchmove=${this.touchMove}
            @touchend=${this.up}
            @keydown=${this.down}
            @keyup=${this.up}
            @click="${this.focusInput}"
          >
            <rect x="19.75" y="8.6" width="5.5" height="1.8" />
            <rect
              x="16.5"
              y="0"
              width="12"
              height="19"
              fill="url(#tipGradient)"
              stroke-width="2.6518"
              rx=".1"
              ry=".1"
            />
            <rect x="22.2" y="0" width=".6" height="19" fill="#efefef" />
          </g>
        </g>
      </svg>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('mouseup', this.up);
    window.addEventListener('mousemove', this.mouseMove);
    window.addEventListener('mouseleave', this.up);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('mouseup', this.up);
    window.removeEventListener('mousemove', this.mouseMove);
    window.removeEventListener('mouseleave', this.up);
  }

  private focusInput() {
    const inputEl: HTMLInputElement | null | undefined = this.shadowRoot?.querySelector(
      '.hide-input'
    );
    inputEl?.focus();
  }

  private down(): void {
    if (!this.isPressed) {
      this.updateCaseDisplayProperties();
    }
    this.isPressed = true;
  }

  private up = () => {
    if (this.isPressed) {
      this.isPressed = false;
    }
  };

  private updateCaseDisplayProperties(): void {
    const element = this.shadowRoot?.querySelector<SVGRectElement>('#sliderCase');
    if (element) {
      this.pageToLocalTransformationMatrix = element.getScreenCTM()?.inverse() || null;
    }

    // Handle zooming in the storybook
    const zoom = getComputedStyle(window.document.body)?.zoom;
    if (zoom !== undefined) {
      this.zoom = Number(zoom);
    } else {
      this.zoom = 1;
    }
  }

  private onInputValueChange(event: KeyboardEvent): void {
    const target = event.target as HTMLInputElement;
    if (target.value) {
      this.updateValue(Number(target.value));
    }
  }

  private mouseMove = (event: MouseEvent) => {
    if (this.isPressed) {
      this.updateValueFromXCoordinate(new DOMPointReadOnly(event.pageX, event.pageY));
    }
  };

  private touchMove(event: TouchEvent): void {
    if (this.isPressed) {
      if (event.targetTouches.length > 0) {
        const touchTarget = event.targetTouches[0];
        this.updateValueFromXCoordinate(new DOMPointReadOnly(touchTarget.pageX, touchTarget.pageY));
      }
    }
  }

  private updateValueFromXCoordinate(position: DOMPointReadOnly): void {
    if (this.pageToLocalTransformationMatrix) {
      // Handle zoom first, the transformation matrix does not take that into account
      let localPosition = new DOMPointReadOnly(position.x / this.zoom, position.y / this.zoom);
      // Converts the point from the page coordinate space to the #caseRect coordinate space
      // It also translates the units from pixels to millimeters!
      localPosition = localPosition.matrixTransform(this.pageToLocalTransformationMatrix);
      const caseBorderWidth = 7.5;
      const tipPositionXinMM = localPosition.x - caseBorderWidth;
      const mmPerIncrement = 30 / (this.max - this.min);
      this.updateValue(Math.round(tipPositionXinMM / mmPerIncrement));
    }
  }

  private updateValue(value: number) {
    this.value = clamp(this.min, this.max, value);
    this.dispatchEvent(new InputEvent('input', { detail: this.value }));
  }
}
