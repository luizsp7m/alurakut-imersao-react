import React, { useEffect, useState } from 'react';
import MainGrid from '../src/components/MainGrid'
import Box from '../src/components/Box'
import jwt from 'jsonwebtoken';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

import { TailSpin } from 'react-loading-icons';

import nookies from 'nookies';

import {
  AlurakutMenu,
  AlurakutProfileSidebarMenuDefault,
  OrkutNostalgicIconSet
} from '../src/lib/AlurakutCommons';

import { ProfileRelationsBoxWrapper } from '../src/components/ProfileRelations';

function ProfileSidebar(propriedades) {
  return (
    <Box as="aside">
      <img src={`https://github.com/${propriedades.githubUser}.png`} style={{ borderRadius: '8px' }} />
      <hr />

      <p>
        <a className="boxLink" href={`https://github.com/${propriedades.githubUser}`}>
          @{propriedades.githubUser}
        </a>
      </p>
      <hr />

      <AlurakutProfileSidebarMenuDefault />
    </Box>
  )
}

function ProfileRelationsBox({ title, itens, type, loading }) {
  return (
    <ProfileRelationsBoxWrapper>
      <h2 className="smallTitle">{title} ({loading ? '0' : itens.length})</h2>

      <ul>
        {loading ? <TailSpin
          stroke="#007fff"
          speed={.75}
          height={'1rem'}
        /> : (
          itens.map((item, index) =>
            index < 6 && (
              <li key={index}>
                { type === 'followers' ? (
                  <a href={item.html_url} target={'_blank'}>
                    <img src={item.avatar_url} />
                    <span>{item.login}</span>
                  </a>
                ) : (
                  <a href={'#'}>
                    <img src={item.imageUrl} />
                    <span>{item.title}</span>
                  </a>
                )}
              </li>
            )
          )
        )}
      </ul>
    </ProfileRelationsBoxWrapper>
  );
}

export default function Home(props) {
  const { githubUser } = props;

  const [followers, setFollowers] = useState([]);
  const [communities, setCommunities] = useState([]);

  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  async function getFollowers() {
    setLoadingFollowers(true);

    await axios.get(`https://api.github.com/users/${githubUser}/followers`)
      .then(response => {
        setFollowers(response.data);
        setInterval(() => { setLoadingFollowers(false); }, 2000)
      })
      .catch(error => {
        console.log(error);
      });
  }

  async function getCommunities() {
    const token = process.env.NEXT_PUBLIC_READ_ONLY;

    setLoadingCommunities(true);

    await fetch('https://graphql.datocms.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: '{ allCommunities { id title imageUrl creatorSlug } }'
      }),
    })
      .then(res => res.json())
      .then((res) => {
        setCommunities(res.data.allCommunities);
        setInterval(() => { setLoadingCommunities(false); }, 2000)
      })
      .catch((error) => {
        console.log(error);
      });
  }

  useEffect(() => {
    getFollowers();
    getCommunities();
  }, []);

  return (
    <>
      <ToastContainer />
      <AlurakutMenu />
      <MainGrid>
        <div className="profileArea" style={{ gridArea: 'profileArea' }}>
          <ProfileSidebar githubUser={githubUser} />
        </div>

        <div className="welcomeArea" style={{ gridArea: 'welcomeArea' }}>
          <Box>
            <h1 className="title">
              Bem vindo(a), {githubUser}
            </h1>

            <OrkutNostalgicIconSet />
          </Box>

          <Box>
            <h2 className="subTitle">O que você deseja fazer?</h2>

            <form onSubmit={function handleCriaComunidade(e) {
              e.preventDefault();

              setLoadingSubmit(true);

              const dadosDoForm = new FormData(e.target);

              if (!dadosDoForm.get('title')) return;
              if (!dadosDoForm.get('image')) return;

              const comunidade = {
                title: dadosDoForm.get('title'),
                imageUrl: dadosDoForm.get('image'),
                creatorSlug: githubUser,
              }

              fetch('/api/comunidades', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(comunidade),
              }).then(async response => {
                // const dados = await response.json();
                // const comunidadesAtualizadas = [...communities, dados.community];
                // setCommunities(comunidadesAtualizadas);
                // console.log(comunidadesAtualizadas);
                setLoadingSubmit(false);
                toast('👏 Comunidade adicionada!');
                getCommunities();
              })
            }}>
              <div>
                <input
                  placeholder="Qual vai ser o nome da sua comunidade?"
                  name="title"
                  aria-label="Qual vai ser o nome da sua comunidade?"
                  type="text"
                />
              </div>

              <div>
                <input
                  placeholder="Coloque uma URL para usarmos de capa"
                  name="image"
                  aria-label="Coloque uma URL para usarmos de capa"
                />
              </div>

              {loadingSubmit ? <button disabled>Aguarde...</button> : <button>Criar comunidade</button>}
            </form>
          </Box>
        </div>

        <div className="profileRelationsArea" style={{ gridArea: 'profileRelationsArea' }}>
          <ProfileRelationsBox
            title={'Comunidades'}
            itens={communities}
            type={'community'}
            loading={loadingCommunities}
          />

          <ProfileRelationsBox
            title={'Pessoas da comunidade'}
            itens={followers}
            type={'followers'}
            loading={loadingFollowers}
          />
        </div>
      </MainGrid>
    </>
  )
}

export async function getServerSideProps(ctx) {
  const cookies = nookies.get(ctx);
  const token = cookies.USER_TOKEN;

  const response = await fetch("https://alurakut-imersao-react-omega.vercel.app/api/auth", {
    headers: {
      Authorization: token,
    },
  });

  const { isAuthenticated } = await response.json();

  if (!isAuthenticated) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const { githubUser } = jwt.decode(token);

  console.log(githubUser, isAuthenticated)

  return {
    props: {
      githubUser,
    },
  };
}