import React, { useRef, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import ImagePicker from 'react-native-image-picker';
import { Form } from '@unform/mobile';
import { FormHandles } from '@unform/core';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import * as Yup from 'yup';

import { useAuth } from '../../hooks/auth';
import getValidationErrors from '../../utils/getValidationErrors';
import api from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';

import {
  Container,
  Title,
  UserAvatarButton,
  UserAvatar,
  BackButton,
  LogoutButton,
  LogoutButtonText,
} from './styles';

interface ProfileFormData {
  name: string;
  email: string;
  old_password: string;
  password: string;
  password_confirmation: string;
}

const SignUp: React.FC = () => {
  const { user, updateUser, signOut } = useAuth();
  const formRef = useRef<FormHandles>(null);
  const inputEmailRef = useRef<TextInput>(null);
  const inputOldPasswordRef = useRef<TextInput>(null);
  const inputPasswordRef = useRef<TextInput>(null);
  const inputConfirmationPasswordRef = useRef<TextInput>(null);
  const navigation = useNavigation();

  const handleSubmit = useCallback(
    async (data: ProfileFormData) => {
      try {
        formRef.current?.setErrors({});

        const schema = Yup.object().shape({
          name: Yup.string().required('Nome obrigatório'),
          email: Yup.string()
            .required('E-mail obrigatório')
            .email('Digite um e-mail válido'),
          old_password: Yup.string(),
          password: Yup.string().when('old_password', {
            is: val => !!val,
            then: Yup.string().required().min(6, 'No mínimo 6 dígitos'),
            otherwise: Yup.string(),
          }),
          password_confirmation: Yup.string()
            .when('old_password', {
              is: val => !!val,
              then: Yup.string().required('Campo obrigatório!'),
              otherwise: Yup.string(),
            })
            .oneOf(
              [Yup.ref('password'), undefined],
              'Confirmação de senha incorreta',
            ),
        });

        await schema.validate(data, {
          abortEarly: false,
        });

        const {
          name,
          email,
          old_password,
          password,
          password_confirmation,
        } = data;

        const formData = {
          name,
          email,
          ...(old_password
            ? { old_password, password, password_confirmation }
            : {}),
        };

        const response = await api.put('/profile', formData);

        updateUser(response.data);

        navigation.goBack();

        Alert.alert('Perfil atualizado com sucesso!');
      } catch (err) {
        if (err instanceof Yup.ValidationError) {
          const errors = getValidationErrors(err);

          formRef.current?.setErrors(errors);

          return;
        }

        Alert.alert(
          'Erro na atualização do perfil',
          'Ocorreu um erro ao atualizar seu perfil, tente novamente.',
        );
      }
    },
    [navigation, updateUser],
  );

  const handleUpdateAvatar = useCallback(() => {
    ImagePicker.showImagePicker(
      {
        title: 'Selecione um avatar',
        cancelButtonTitle: 'Cancelar',
        takePhotoButtonTitle: 'Usar câmera',
        chooseFromLibraryButtonTitle: 'Escolha da galeria',
      },
      response => {
        if (response.didCancel) {
          return;
        }

        if (response.error) {
          Alert.alert('Error ao atualizar seu avatar');
          return;
        }

        const data = new FormData();

        data.append('avatar', {
          type: 'image/jpeg',
          name: `${user.id}.jpg`,
          uri: response.uri,
        });

        api
          .patch('/users/avatar', data)
          .then(apiResponse => {
            updateUser(apiResponse.data);

            Alert.alert('Avatar atualizado com sucesso!');
          })
          .catch(err => {
            Alert.alert('Falha ao atualizar seu avatar');
          });
      },
    );
  }, [updateUser, user.id]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled
    >
      <ScrollView
        contentContainerStyle={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Container>
          <BackButton onPress={handleGoBack}>
            <Icon name="chevron-left" size={24} color="#999591" />
          </BackButton>
          <UserAvatarButton onPress={handleUpdateAvatar}>
            <UserAvatar source={{ uri: user.avatar_url }} />
          </UserAvatarButton>
          <View>
            <Title>Meu perfil</Title>
          </View>
          <Form ref={formRef} initialData={user} onSubmit={handleSubmit}>
            <Input
              autoCapitalize="words"
              name="name"
              icon="user"
              placeholder="Nome"
              returnKeyType="next"
              onSubmitEditing={() => inputEmailRef.current?.focus()}
            />
            <Input
              ref={inputEmailRef}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              name="email"
              icon="mail"
              placeholder="E-mail"
              returnKeyType="next"
              onSubmitEditing={() => inputOldPasswordRef.current?.focus()}
            />

            <Input
              ref={inputOldPasswordRef}
              autoCapitalize="none"
              secureTextEntry
              name="old_password"
              containerStyle={{ marginTop: 16 }}
              icon="lock"
              placeholder="Senha atual"
              returnKeyType="next"
              onSubmitEditing={() => inputPasswordRef.current?.focus()}
            />
            <Input
              ref={inputPasswordRef}
              autoCapitalize="none"
              secureTextEntry
              name="password"
              icon="lock"
              placeholder="Nova senha"
              returnKeyType="next"
              onSubmitEditing={
                () => inputConfirmationPasswordRef.current?.focus()
                // eslint-disable-next-line react/jsx-curly-newline
              }
            />
            <Input
              ref={inputConfirmationPasswordRef}
              autoCapitalize="none"
              secureTextEntry
              name="password_confirmation"
              icon="lock"
              placeholder="Confirmar senha"
              returnKeyType="send"
              onSubmitEditing={() => formRef.current?.submitForm()}
            />
            <Button onPress={() => formRef.current?.submitForm()}>
              Confirmar mudanças
            </Button>
          </Form>
          <LogoutButton onPress={signOut}>
            <LogoutButtonText>Sair</LogoutButtonText>
          </LogoutButton>
        </Container>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUp;
