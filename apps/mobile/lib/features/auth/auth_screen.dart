import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_button.dart';
import '../../core/design/widgets/nora_brand_mark.dart';
import '../../core/design/widgets/nora_card.dart';
import '../../core/design/widgets/nora_input.dart';
import '../../core/design/widgets/nora_scaffold.dart';
import 'auth_controller.dart';

enum _AuthMode { login, register, recovery }

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _recoveryQuestionController = TextEditingController();
  final _recoveryAnswerController = TextEditingController();
  final _newPasswordController = TextEditingController();

  _AuthMode? _selectedMode;
  String? _resolvedRecoveryQuestion;
  String? _successMessage;
  bool _showPassword = false;
  bool _showNewPassword = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _recoveryQuestionController.dispose();
    _recoveryAnswerController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final mode = _selectedMode ??
        (auth.hasLocalUsers == false ? _AuthMode.register : _AuthMode.login);
    final validationMessage = _validationMessage(mode);
    final primaryEnabled = !auth.loading && validationMessage == null;
    final visibleError = auth.error ?? validationMessage;

    return NoraScaffold(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      child: Center(
        child: SingleChildScrollView(
          child: NoraCard(
            glass: true,
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(child: NoraBrandMark(size: 74)),
                const SizedBox(height: NoraSpacing.lg),
                Text(
                  _titleFor(mode),
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: NoraSpacing.sm),
                Text(
                  'Tu sistema. Tu vida. Una sola IA.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                ),
                const SizedBox(height: NoraSpacing.lg),
                SegmentedButton<_AuthMode>(
                  segments: const [
                    ButtonSegment(
                      value: _AuthMode.login,
                      label: Text('Login'),
                      icon: Icon(Icons.login_rounded),
                    ),
                    ButtonSegment(
                      value: _AuthMode.register,
                      label: Text('Registro'),
                      icon: Icon(Icons.person_add_alt_1_rounded),
                    ),
                    ButtonSegment(
                      value: _AuthMode.recovery,
                      label: Text('Recuperar'),
                      icon: Icon(Icons.key_rounded),
                    ),
                  ],
                  selected: {mode},
                  onSelectionChanged: auth.loading
                      ? null
                      : (value) {
                          ref.read(authControllerProvider.notifier).clearError();
                          setState(() {
                            _selectedMode = value.first;
                            _resolvedRecoveryQuestion = null;
                            _successMessage = null;
                            _showPassword = false;
                            _showNewPassword = false;
                          });
                        },
                ),
                const SizedBox(height: NoraSpacing.xl),
                ..._fieldsFor(mode),
                if (visibleError != null) ...[
                  const SizedBox(height: NoraSpacing.md),
                  _MessageBox(message: visibleError, kind: _MessageKind.error),
                ],
                if (_successMessage != null) ...[
                  const SizedBox(height: NoraSpacing.md),
                  _MessageBox(message: _successMessage!, kind: _MessageKind.success),
                ],
                const SizedBox(height: NoraSpacing.xl),
                NoraButton(
                  label: _primaryLabel(mode, auth.loading),
                  icon: _primaryIcon(mode),
                  expand: true,
                  onPressed: primaryEnabled ? () => _submit(mode) : null,
                ),
                if (mode == _AuthMode.register && auth.hasLocalUsers == false) ...[
                  const SizedBox(height: NoraSpacing.md),
                  Text(
                    'Primer arranque: crea tu cuenta local para entrar a Nora OS.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _fieldsFor(_AuthMode mode) {
    final fields = <Widget>[
      NoraInput(
        controller: _usernameController,
        label: 'Usuario',
        hint: 'natalia',
        icon: Icons.person_outline_rounded,
        textInputAction: TextInputAction.next,
        autofillHints: const [AutofillHints.username],
        onChanged: (_) => _onFieldChanged(),
      ),
    ];

    if (mode == _AuthMode.login) {
      fields.addAll([
        const SizedBox(height: NoraSpacing.md),
        NoraInput(
          controller: _passwordController,
          label: 'Contrasena',
          icon: Icons.lock_outline_rounded,
          obscureText: !_showPassword,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.password],
          suffixIcon: _PasswordToggle(
            visible: _showPassword,
            onPressed: () => setState(() => _showPassword = !_showPassword),
          ),
          onChanged: (_) => _onFieldChanged(),
        ),
      ]);
      return fields;
    }

    if (mode == _AuthMode.register) {
      fields.addAll([
        const SizedBox(height: NoraSpacing.md),
        NoraInput(
          controller: _passwordController,
          label: 'Contrasena (min 8 caracteres)',
          icon: Icons.lock_outline_rounded,
          obscureText: !_showPassword,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.newPassword],
          suffixIcon: _PasswordToggle(
            visible: _showPassword,
            onPressed: () => setState(() => _showPassword = !_showPassword),
          ),
          onChanged: (_) => _onFieldChanged(),
        ),
        const SizedBox(height: NoraSpacing.md),
        NoraInput(
          controller: _recoveryQuestionController,
          label: 'Pregunta de recuperacion (min 10 caracteres)',
          hint: 'Ej: cual es tu proyecto favorito?',
          icon: Icons.help_outline_rounded,
          textInputAction: TextInputAction.next,
          onChanged: (_) => _onFieldChanged(),
        ),
        const SizedBox(height: NoraSpacing.md),
        NoraInput(
          controller: _recoveryAnswerController,
          label: 'Respuesta',
          hint: 'Privada y sensible a mayusculas',
          icon: Icons.key_outlined,
          textInputAction: TextInputAction.done,
          onChanged: (_) => _onFieldChanged(),
        ),
      ]);
      return fields;
    }

    final question = _resolvedRecoveryQuestion;
    if (question != null) {
      fields.addAll([
        const SizedBox(height: NoraSpacing.md),
        NoraCard(
          glass: false,
          padding: const EdgeInsets.all(12),
          child: Text(
            question,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.text),
          ),
        ),
        const SizedBox(height: NoraSpacing.md),
        NoraInput(
          controller: _recoveryAnswerController,
          label: 'Respuesta',
          icon: Icons.key_outlined,
          textInputAction: TextInputAction.next,
          onChanged: (_) => _onFieldChanged(),
        ),
        const SizedBox(height: NoraSpacing.md),
        NoraInput(
          controller: _newPasswordController,
          label: 'Nueva contrasena (min 8 caracteres)',
          icon: Icons.lock_reset_rounded,
          obscureText: !_showNewPassword,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.newPassword],
          suffixIcon: _PasswordToggle(
            visible: _showNewPassword,
            onPressed: () => setState(() => _showNewPassword = !_showNewPassword),
          ),
          onChanged: (_) => _onFieldChanged(),
        ),
      ]);
    }
    return fields;
  }

  void _onFieldChanged() {
    ref.read(authControllerProvider.notifier).clearError();
    if (_successMessage != null) _successMessage = null;
    setState(() {});
  }

  String? _validationMessage(_AuthMode mode) {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;
    final recoveryQuestion = _recoveryQuestionController.text.trim();
    final recoveryAnswer = _recoveryAnswerController.text.trim();
    final newPassword = _newPasswordController.text;

    if (username.isEmpty) return 'Ingresa usuario para continuar.';
    if (username.length < 3 && mode != _AuthMode.recovery) {
      return 'El usuario debe tener al menos 3 caracteres.';
    }
    if (username.length > 32 && mode != _AuthMode.recovery) {
      return 'El usuario no puede exceder 32 caracteres.';
    }
    if (mode != _AuthMode.recovery && !RegExp(r'^[a-zA-Z0-9._-]+$').hasMatch(username)) {
      return 'Usa letras, numeros, puntos, guiones o guion bajo.';
    }

    if (mode == _AuthMode.login) {
      if (password.isEmpty) return 'Ingresa usuario y contrasena.';
      return null;
    }

    if (mode == _AuthMode.register) {
      if (password.isEmpty) return 'La contrasena no puede estar vacia.';
      if (password.length < 8) return 'La contrasena debe tener minimo 8 caracteres.';
      if (recoveryQuestion.isEmpty) return 'La pregunta de recuperacion no puede estar vacia.';
      if (recoveryQuestion.length < 10) {
        return 'La pregunta de recuperacion debe tener minimo 10 caracteres.';
      }
      if (recoveryAnswer.isEmpty) return 'La respuesta de recuperacion no puede estar vacia.';
      if (recoveryAnswer.length < 2) return 'La respuesta de recuperacion debe tener minimo 2 caracteres.';
      return null;
    }

    if (_resolvedRecoveryQuestion == null) return null;
    if (recoveryAnswer.isEmpty) return 'La respuesta de recuperacion no puede estar vacia.';
    if (recoveryAnswer.length < 2) return 'La respuesta de recuperacion debe tener minimo 2 caracteres.';
    if (newPassword.isEmpty) return 'La contrasena no puede estar vacia.';
    if (newPassword.length < 8) return 'La contrasena debe tener minimo 8 caracteres.';
    return null;
  }

  Future<void> _submit(_AuthMode mode) async {
    final validationMessage = _validationMessage(mode);
    if (validationMessage != null) {
      ref.read(authControllerProvider.notifier).setValidationError(validationMessage);
      _showError(validationMessage);
      return;
    }

    try {
      if (mode == _AuthMode.register) {
        await ref.read(authControllerProvider.notifier).register(
              username: _usernameController.text,
              password: _passwordController.text,
              recoveryQuestion: _recoveryQuestionController.text,
              recoveryAnswer: _recoveryAnswerController.text,
            );
        if (!mounted) return;
        context.go('/');
        return;
      }

      if (mode == _AuthMode.login) {
        await ref.read(authControllerProvider.notifier).login(
              _usernameController.text,
              _passwordController.text,
            );
        if (!mounted) return;
        context.go('/');
        return;
      }

      if (_resolvedRecoveryQuestion == null) {
        final question = await ref
            .read(authControllerProvider.notifier)
            .getRecoveryQuestion(_usernameController.text);
        if (!mounted) return;
        if (question == null) {
          const message = 'Usuario no encontrado.';
          ref.read(authControllerProvider.notifier).setValidationError(message);
          _showError(message);
          return;
        }
        setState(() {
          _resolvedRecoveryQuestion = question;
          _successMessage = null;
        });
        return;
      }

      await ref.read(authControllerProvider.notifier).resetPasswordWithRecovery(
            username: _usernameController.text,
            recoveryAnswer: _recoveryAnswerController.text,
            newPassword: _newPasswordController.text,
          );
      if (!mounted) return;
      setState(() {
        _selectedMode = _AuthMode.login;
        _passwordController.clear();
        _recoveryAnswerController.clear();
        _newPasswordController.clear();
        _resolvedRecoveryQuestion = null;
        _successMessage = 'Contrasena actualizada. Inicia sesion con tu nueva contrasena.';
      });
    } catch (error) {
      if (!mounted) return;
      final message = ref.read(authControllerProvider).error ?? 'No se pudo completar la accion.';
      _showError(message);
    }
  }

  String _titleFor(_AuthMode mode) {
    switch (mode) {
      case _AuthMode.login:
        return 'Iniciar sesion';
      case _AuthMode.register:
        return 'Crear cuenta';
      case _AuthMode.recovery:
        return 'Recuperar acceso';
    }
  }

  String _primaryLabel(_AuthMode mode, bool loading) {
    switch (mode) {
      case _AuthMode.login:
        return loading ? 'Ingresando...' : 'Entrar';
      case _AuthMode.register:
        return loading ? 'Creando...' : 'Crear cuenta';
      case _AuthMode.recovery:
        if (_resolvedRecoveryQuestion == null) {
          return loading ? 'Buscando...' : 'Ver pregunta secreta';
        }
        return loading ? 'Actualizando...' : 'Actualizar contrasena';
    }
  }

  IconData _primaryIcon(_AuthMode mode) {
    switch (mode) {
      case _AuthMode.login:
        return Icons.login_rounded;
      case _AuthMode.register:
        return Icons.add_rounded;
      case _AuthMode.recovery:
        return _resolvedRecoveryQuestion == null ? Icons.search_rounded : Icons.lock_reset_rounded;
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}

class _PasswordToggle extends StatelessWidget {
  const _PasswordToggle({
    required this.visible,
    required this.onPressed,
  });

  final bool visible;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: visible ? 'Ocultar contrasena' : 'Mostrar contrasena',
      onPressed: onPressed,
      icon: Icon(
        visible ? Icons.visibility_off_outlined : Icons.visibility_outlined,
        color: NoraColors.muted,
      ),
    );
  }
}

enum _MessageKind { error, success }

class _MessageBox extends StatelessWidget {
  const _MessageBox({
    required this.message,
    required this.kind,
  });

  final String message;
  final _MessageKind kind;

  @override
  Widget build(BuildContext context) {
    final isError = kind == _MessageKind.error;
    final color = isError ? NoraColors.danger : NoraColors.success;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
