/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

interface AmbientAPI {
  dragStart(): void;
  dragEnd(): void;
  click(): void;
}

interface Window {
  ambientAPI: AmbientAPI;
}
