import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  restaurantName: string;
  subdomain: string;
}

export default function Signup() {
  const router = useRouter();
  const { t } = useTranslation(['signup', 'common']);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupForm>();
  const signup = useAuthStore((state) => state.signup);
  const [isLoading, setIsLoading] = useState(false);

  const password = watch('password');

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      await signup(data.email, data.password, data.restaurantName, data.subdomain);
      toast.success(t('signup:signupSuccess'));
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('signup:signupFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('signup:title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('signup:subtitle')}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700">
                {t('signup:restaurantName')}
              </label>
              <input
                {...register('restaurantName', { required: t('signup:restaurantNameRequired') })}
                type="text"
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={t('signup:restaurantName')}
              />
              {errors.restaurantName && (
                <p className="text-red-500 text-xs mt-1">{errors.restaurantName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700">
                {t('signup:subdomain')}
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  {...register('subdomain', {
                    required: t('signup:subdomainRequired'),
                    pattern: {
                      value: /^[a-z0-9-]+$/,
                      message: t('signup:subdomainInvalid'),
                    },
                  })}
                  type="text"
                  className="flex-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="my-restaurant"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  .qrmenu.app
                </span>
              </div>
              {errors.subdomain && (
                <p className="text-red-500 text-xs mt-1">{errors.subdomain.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('signup:email')}
              </label>
              <input
                {...register('email', {
                  required: t('signup:emailRequired'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('signup:emailInvalid'),
                  },
                })}
                type="email"
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('signup:password')}
              </label>
              <input
                {...register('password', {
                  required: t('signup:passwordRequired'),
                  minLength: {
                    value: 6,
                    message: t('signup:passwordMinLength'),
                  },
                })}
                type="password"
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('signup:confirmPassword')}
              </label>
              <input
                {...register('confirmPassword', {
                  required: t('signup:confirmPasswordRequired'),
                  validate: (value) => value === password || t('signup:passwordsMustMatch'),
                })}
                type="password"
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? t('signup:creatingAccount') : t('signup:createAccount')}
            </button>
          </div>

          <div className="text-center">
            <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              {t('signup:haveAccount')} {t('signup:signIn')}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['signup', 'common'])),
    },
  };
}
