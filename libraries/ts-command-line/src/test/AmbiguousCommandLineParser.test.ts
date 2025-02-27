// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineAction } from '../providers/CommandLineAction';
import type { CommandLineStringParameter } from '../parameters/CommandLineStringParameter';
import { CommandLineParser } from '../providers/CommandLineParser';
import { ScopedCommandLineAction } from '../providers/ScopedCommandLineAction';
import type { CommandLineFlagParameter } from '../parameters/CommandLineFlagParameter';
import type { CommandLineParameterProvider } from '../providers/CommandLineParameterProvider';
import { SCOPING_PARAMETER_GROUP } from '../Constants';

class GenericCommandLine extends CommandLineParser {
  public constructor(actionType: new () => CommandLineAction) {
    super({
      toolFilename: 'example',
      toolDescription: 'An example project'
    });

    this.addAction(new actionType());
  }
}

class AmbiguousAction extends CommandLineAction {
  public done: boolean = false;
  private _short1Arg: CommandLineStringParameter;
  private _shortArg2: CommandLineStringParameter;
  private _scope1Arg: CommandLineStringParameter;
  private _scope2Arg: CommandLineStringParameter;
  private _nonConflictingArg: CommandLineStringParameter;

  public constructor() {
    super({
      actionName: 'do:the-job',
      summary: 'does the job',
      documentation: 'a longer description'
    });

    this._short1Arg = this.defineStringParameter({
      parameterLongName: '--short1',
      parameterShortName: '-s',
      argumentName: 'ARG',
      description: 'The argument'
    });
    this._shortArg2 = this.defineStringParameter({
      parameterLongName: '--short2',
      parameterShortName: '-s',
      argumentName: 'ARG',
      description: 'The argument'
    });
    this._scope1Arg = this.defineStringParameter({
      parameterLongName: '--arg',
      parameterScope: 'scope1',
      argumentName: 'ARG',
      description: 'The argument'
    });
    this._scope2Arg = this.defineStringParameter({
      parameterLongName: '--arg',
      parameterScope: 'scope2',
      argumentName: 'ARG',
      description: 'The argument'
    });
    this._nonConflictingArg = this.defineStringParameter({
      parameterLongName: '--non-conflicting-arg',
      parameterScope: 'scope',
      argumentName: 'ARG',
      description: 'The argument'
    });
  }

  protected async onExecute(): Promise<void> {
    expect(this._short1Arg.value).toEqual('short1value');
    expect(this._shortArg2.value).toEqual('short2value');
    expect(this._scope1Arg.value).toEqual('scope1value');
    expect(this._scope2Arg.value).toEqual('scope2value');
    expect(this._nonConflictingArg.value).toEqual('nonconflictingvalue');
    this.done = true;
  }
}

class AmbiguousScopedAction extends ScopedCommandLineAction {
  public done: boolean = false;
  public short1Value: string | undefined;
  public short2Value: string | undefined;
  public scope1Value: string | undefined;
  public scope2Value: string | undefined;
  public nonConflictingValue: string | undefined;
  private _scopingArg: CommandLineFlagParameter | undefined;
  private _short1Arg: CommandLineStringParameter | undefined;
  private _short2Arg: CommandLineStringParameter | undefined;
  private _scope1Arg: CommandLineStringParameter | undefined;
  private _scope2Arg: CommandLineStringParameter | undefined;
  private _nonConflictingArg: CommandLineStringParameter | undefined;

  public constructor() {
    super({
      actionName: 'scoped-action',
      summary: 'does the scoped action',
      documentation: 'a longer description'
    });
  }

  protected async onExecute(): Promise<void> {
    expect(this._scopingArg?.value).toEqual(true);
    if (this._short1Arg?.value) {
      this.short1Value = this._short1Arg.value;
    }
    if (this._short2Arg?.value) {
      this.short2Value = this._short2Arg.value;
    }
    if (this._scope1Arg?.value) {
      this.scope1Value = this._scope1Arg.value;
    }
    if (this._scope2Arg?.value) {
      this.scope2Value = this._scope2Arg.value;
    }
    if (this._nonConflictingArg?.value) {
      this.nonConflictingValue = this._nonConflictingArg.value;
    }
    this.done = true;
  }

  protected onDefineUnscopedParameters(): void {
    // At least one scoping parameter is required to be defined on a scoped action
    this._scopingArg = this.defineFlagParameter({
      parameterLongName: '--scoping',
      description: 'The scoping parameter',
      parameterGroup: SCOPING_PARAMETER_GROUP
    });
  }

  protected onDefineScopedParameters(scopedParameterProvider: CommandLineParameterProvider): void {
    this._short1Arg = scopedParameterProvider.defineStringParameter({
      parameterLongName: '--short1',
      parameterShortName: '-s',
      argumentName: 'ARG',
      description: 'The argument'
    });
    this._short2Arg = scopedParameterProvider.defineStringParameter({
      parameterLongName: '--short2',
      parameterShortName: '-s',
      argumentName: 'ARG',
      description: 'The argument'
    });
    this._scope1Arg = scopedParameterProvider.defineStringParameter({
      parameterLongName: '--arg',
      parameterShortName: '-a',
      parameterScope: 'scope1',
      argumentName: 'ARG',
      description: 'The argument'
    });
    this._scope2Arg = scopedParameterProvider.defineStringParameter({
      parameterLongName: '--arg',
      parameterShortName: '-a',
      parameterScope: 'scope2',
      argumentName: 'ARG',
      description: 'The argument'
    });
    this._nonConflictingArg = scopedParameterProvider.defineStringParameter({
      parameterLongName: '--non-conflicting-arg',
      parameterShortName: '-a',
      parameterScope: 'scope',
      argumentName: 'ARG',
      description: 'The argument'
    });
  }
}

describe(`Ambiguous ${CommandLineParser.name}`, () => {
  it('fails to execute when an ambiguous short name is provided', async () => {
    const commandLineParser: GenericCommandLine = new GenericCommandLine(AmbiguousAction);

    await expect(
      commandLineParser.executeWithoutErrorHandling(['do:the-job', '-s'])
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it('can execute the non-ambiguous scoped long names', async () => {
    const commandLineParser: GenericCommandLine = new GenericCommandLine(AmbiguousAction);

    await commandLineParser.execute([
      'do:the-job',
      '--short1',
      'short1value',
      '--short2',
      'short2value',
      '--scope1:arg',
      'scope1value',
      '--scope2:arg',
      'scope2value',
      '--non-conflicting-arg',
      'nonconflictingvalue'
    ]);
    expect(commandLineParser.selectedAction).toBeDefined();
    expect(commandLineParser.selectedAction!.actionName).toEqual('do:the-job');

    const action: AmbiguousAction = commandLineParser.selectedAction as AmbiguousAction;
    expect(action.done).toBe(true);

    expect(action.renderHelpText()).toMatchSnapshot();
    expect(action.getParameterStringMap()).toMatchSnapshot();
  });

  it('fails to execute when an ambiguous long name is provided', async () => {
    const commandLineParser: GenericCommandLine = new GenericCommandLine(AmbiguousAction);

    await expect(
      commandLineParser.executeWithoutErrorHandling(['do:the-job', '--arg', 'test'])
    ).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe(`Ambiguous scoping ${CommandLineParser.name}`, () => {
  it('fails to execute when an ambiguous short name is provided to a scoping action', async () => {
    const commandLineParser: GenericCommandLine = new GenericCommandLine(AmbiguousScopedAction);

    await expect(
      commandLineParser.executeWithoutErrorHandling(['scoped-action', '--scoping', '--', '-s'])
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it('fails to execute when an ambiguous short name is provided to a scoping action with a matching ambiguous long name', async () => {
    const commandLineParser: GenericCommandLine = new GenericCommandLine(AmbiguousScopedAction);

    await expect(
      commandLineParser.executeWithoutErrorHandling(['scoped-action', '--scoping', '--', '-a'])
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it('can execute the non-ambiguous scoped long names on the scoping action', async () => {
    const commandLineParser: GenericCommandLine = new GenericCommandLine(AmbiguousScopedAction);

    await commandLineParser.execute([
      'scoped-action',
      '--scoping',
      '--',
      '--short1',
      'short1value',
      '--short2',
      'short2value',
      '--scope1:arg',
      'scope1value',
      '--scope2:arg',
      'scope2value',
      '--non-conflicting-arg',
      'nonconflictingvalue'
    ]);
    expect(commandLineParser.selectedAction).toBeDefined();
    expect(commandLineParser.selectedAction!.actionName).toEqual('scoped-action');

    const action: AmbiguousScopedAction = commandLineParser.selectedAction as AmbiguousScopedAction;
    expect(action.done).toBe(true);
    expect(action.short1Value).toEqual('short1value');
    expect(action.short2Value).toEqual('short2value');
    expect(action.scope1Value).toEqual('scope1value');
    expect(action.scope2Value).toEqual('scope2value');
    expect(action.nonConflictingValue).toEqual('nonconflictingvalue');
  });

  it('fails to execute when an ambiguous long name is provided to a scoping action', async () => {
    const commandLineParser: GenericCommandLine = new GenericCommandLine(AmbiguousScopedAction);

    await expect(
      commandLineParser.executeWithoutErrorHandling(['scoped-action', '--scoping', '--', '--arg', 'test'])
    ).rejects.toThrowErrorMatchingSnapshot();
  });
});
